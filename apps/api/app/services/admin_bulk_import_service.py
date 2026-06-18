"""Admin bulk prompt import — validate-then-commit, all-or-nothing.

Design notes
------------
* Reuses the exact single-create pipeline (`remap_prompt_data` → `create_*` /
  `update_*`) so a bulk-imported prompt is byte-for-byte identical to one created
  through the form — same sanitisation, same version snapshot, same audit log.
* All-or-nothing: the validation pass writes NOTHING. Only when every row is
  valid do we run the write pass. A write-phase exception propagates so the
  request-scoped session (`get_db`) rolls the whole batch back. Callers must NOT
  swallow such exceptions and return normally, or partial writes would commit.
* Idempotency: rows carry a `slug`. Provided slugs are subject to `on_conflict`
  (error / skip / update); auto-derived slugs are always made unique so re-titled
  rows never collide spuriously.
* Task 5 integrity: speaking Task 5 rows are structurally validated (exactly two
  option cards, a curveball, a sane default index). Non-Task-5 rows must not carry
  Task 5 fields. This catches mis-shaped rows that schema validation alone allows.
* Images are referenced, not uploaded: every referenced S3 key (Task 5 option
  images + Task 3/4/8 scene images) is HEAD-checked so a typo'd / not-yet-uploaded
  key fails the dry run instead of silently rendering a broken image later.
* Traceability: every created/updated row's audit log gets a shared
  `bulk_import_batch_id`, so an import can be found — and reversed — as a unit.
"""
from typing import Any, Awaitable, Callable
from uuid import UUID, uuid4

from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

import app.services.admin_prompt_service as svc
from app.api.v1._bulk_schemas import BulkImportResult, BulkRowError
from app.api.v1._prompt_helpers import extract_s3_key, remap_prompt_data
from app.api.v1._prompt_schemas import SpeakingPromptIn, WritingPromptIn
from app.repositories.admin_prompt_repo import AdminSpeakingPromptRepo, AdminWritingPromptRepo
from app.services.slug import slugify, unique_slug
from app.services.storage.presigner import objects_exist

# Fields that only belong on a Task 5 (Comparing & Persuading) speaking prompt.
_TASK5_ONLY_FIELDS = (
    "choice_options", "curveball_option", "curveball_instruction_text", "default_choice_index",
)


def _format_validation_errors(exc: ValidationError) -> list[str]:
    """Flatten a Pydantic ValidationError into human-readable "field: message" lines."""
    out: list[str] = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err.get("loc", ()) if p != "__root__")
        msg = err.get("msg", "invalid value")
        out.append(f"{loc}: {msg}" if loc else msg)
    return out


def _validate_task5(payload: dict[str, Any]) -> list[str]:
    """Structural rules a Task 5 prompt must satisfy to render correctly."""
    errs: list[str] = []

    opts = payload.get("choice_options")
    if not isinstance(opts, list) or len(opts) != 2:
        errs.append("Task 5 requires exactly 2 choice_options.")
    else:
        for i, opt in enumerate(opts):
            if not (isinstance(opt, dict) and str(opt.get("name") or "").strip()):
                errs.append(f"choice_options[{i}].name is required.")

    cb = payload.get("curveball_option")
    if not isinstance(cb, dict):
        errs.append("Task 5 requires a curveball_option.")
    elif not str(cb.get("name") or "").strip():
        errs.append("curveball_option.name is required.")

    dci = payload.get("default_choice_index")
    if dci is not None and dci not in (0, 1):
        errs.append("default_choice_index must be 0 or 1.")

    return errs


def _validate_non_task5(payload: dict[str, Any]) -> list[str]:
    """A non-Task-5 row must not carry Task 5 fields (likely a mis-tagged row)."""
    # payload comes from model_dump(exclude_none=True), so a present key is a real value.
    present = [f for f in _TASK5_ONLY_FIELDS if f in payload]
    if present:
        return [f"task_number {payload.get('task_number')} must not include Task 5 fields: "
                f"{', '.join(present)}."]
    return []


def _row_image_keys(payload: dict[str, Any]) -> list[str]:
    """Collect the bare S3 keys a row references (scene image + Task 5 option images)."""
    raw: list[str] = []
    if payload.get("context_image_url"):
        raw.append(payload["context_image_url"])
    for opt in (payload.get("choice_options") or []):
        if isinstance(opt, dict) and opt.get("image_url"):
            raw.append(opt["image_url"])
    cb = payload.get("curveball_option")
    if isinstance(cb, dict) and cb.get("image_url"):
        raw.append(cb["image_url"])

    keys: list[str] = []
    for url in raw:
        try:
            keys.append(extract_s3_key(url))
        except Exception:  # noqa: BLE001 — empty/garbage url, skip silently
            pass
    return keys


# A planned write: (row index, action, db-ready payload, slug, title, image keys)
_Plan = tuple[int, str, dict[str, Any], str, str | None, list[str]]


async def _bulk_import(
    session: AsyncSession,
    *,
    skill: str,
    items: list[dict[str, Any]],
    mode: str,
    on_conflict: str,
    default_status: str,
    check_images: bool,
    admin_id: UUID,
    schema_cls: type[BaseModel],
    repo: AdminSpeakingPromptRepo | AdminWritingPromptRepo,
    create_fn: Callable[..., Awaitable[Any]],
    update_fn: Callable[..., Awaitable[Any]],
) -> BulkImportResult:
    batch_id = uuid4()
    errors: list[BulkRowError] = []
    warnings: list[str] = []
    plan: list[_Plan] = []

    existing_slugs = await repo.all_slugs()
    # `taken` = existing DB slugs + EVERY slug already assigned to a row in this
    # batch (provided OR auto-derived). One unified set so a provided slug and an
    # auto-derived slug can never silently collide and then blow up at COMMIT with
    # an IntegrityError (the slug column is UNIQUE on both prompt tables).
    taken = set(existing_slugs)
    batch_slugs: set[str] = set()    # only slugs assigned in THIS batch (dup detection)

    # ── Phase 1a: validate + plan (NO writes) ──────────────────────────────────
    for index, raw in enumerate(items):
        if not isinstance(raw, dict):
            errors.append(BulkRowError(index=index, errors=["Row must be a JSON object."]))
            continue

        data = dict(raw)
        # default_status only fills in rows that didn't specify their own status.
        data.setdefault("status", default_status)

        try:
            model = schema_cls.model_validate(data)
        except ValidationError as exc:
            errors.append(BulkRowError(
                index=index,
                slug=raw.get("slug") if isinstance(raw.get("slug"), str) else None,
                title=raw.get("title") if isinstance(raw.get("title"), str) else None,
                errors=_format_validation_errors(exc),
            ))
            continue

        payload = model.model_dump(exclude_none=True)
        title = payload.get("title")

        # Task-specific structural validation (speaking only — writing has no Task 5).
        if skill == "speaking":
            shape_errs = (_validate_task5(payload) if payload.get("task_number") == 5
                          else _validate_non_task5(payload))
            if shape_errs:
                errors.append(BulkRowError(index=index, slug=payload.get("slug"),
                                           title=title, errors=shape_errs))
                continue

        provided = (payload.get("slug") or "").strip() or None
        action = "create"
        if provided:
            # Catches provided-vs-provided AND provided-vs-earlier-auto collisions,
            # because every assigned slug (provided or auto) lands in batch_slugs.
            if provided in batch_slugs:
                errors.append(BulkRowError(
                    index=index, slug=provided, title=title,
                    errors=[f"Slug '{provided}' is used by more than one row in this file."],
                ))
                continue
            slug = provided
            if provided in existing_slugs:
                if on_conflict == "error":
                    errors.append(BulkRowError(
                        index=index, slug=provided, title=title,
                        errors=[f"A {skill} prompt with slug '{provided}' already exists."],
                    ))
                    continue
                action = "skip" if on_conflict == "skip" else "update"
        else:
            # Auto slug uniquified against existing DB slugs AND every slug already
            # assigned this batch (taken), so it can't collide with an earlier
            # provided slug either.
            slug = unique_slug(slugify(title), taken)

        taken.add(slug)
        batch_slugs.add(slug)
        payload["slug"] = slug
        plan.append((index, action, payload, slug, title, _row_image_keys(payload)))

    # ── Phase 1b: verify referenced images exist in storage ────────────────────
    if check_images:
        existence = await objects_exist(k for _, _, _, _, _, ks in plan for k in ks)
        undetermined: set[str] = set()
        kept: list[_Plan] = []
        for row in plan:
            index, _action, _payload, slug, title, keys = row
            missing = [k for k in keys if existence.get(k) is False]
            undetermined.update(k for k in keys if existence.get(k) is None)
            if missing:
                errors.append(BulkRowError(
                    index=index, slug=slug, title=title,
                    errors=[f"Referenced image not found in storage: {k}" for k in missing],
                ))
            else:
                kept.append(row)
        plan = kept
        errors.sort(key=lambda e: e.index)
        if undetermined:
            warnings.append(
                f"Could not verify {len(undetermined)} image key(s) against storage; "
                "treated as present. Check S3 credentials/connectivity if unexpected."
            )

    to_create = sum(1 for _, a, _, _, _, _ in plan if a == "create")
    to_update = sum(1 for _, a, _, _, _, _ in plan if a == "update")
    to_skip = sum(1 for _, a, _, _, _, _ in plan if a == "skip")

    result = BulkImportResult(
        skill=skill, mode=mode, ok=not errors,
        total=len(items), valid=len(items) - len(errors),
        to_create=to_create, to_update=to_update, to_skip=to_skip,
        errors=errors, warnings=warnings,
    )

    # Dry run, or any error under all-or-nothing → return the report, write nothing.
    if mode == "validate" or errors:
        result.skipped = to_skip if mode == "validate" else 0
        return result

    # ── Phase 2: commit (every row is valid) ───────────────────────────────────
    # An exception here propagates to get_db, which rolls the whole batch back.
    meta_base = {"bulk_import_batch_id": str(batch_id), "skill": skill}
    created = updated = skipped = 0

    for index, action, payload, slug, _title, _keys in plan:
        if action == "skip":
            skipped += 1
            continue

        mapped = remap_prompt_data(dict(payload))
        audit_meta = {**meta_base, "row": index}

        if action == "update":
            target = await repo.get_by_slug(slug)
            if target is None:           # vanished between plan and write — create instead
                await create_fn(session, mapped, admin_id, audit_metadata=audit_meta)
                created += 1
            else:
                await update_fn(session, target, mapped, admin_id, audit_metadata=audit_meta)
                updated += 1
        else:
            await create_fn(session, mapped, admin_id, audit_metadata=audit_meta)
            created += 1

    result.created = created
    result.updated = updated
    result.skipped = skipped
    result.batch_id = str(batch_id)
    return result


async def bulk_import_speaking(
    session: AsyncSession, *, items: list[dict[str, Any]], mode: str,
    on_conflict: str, default_status: str, check_images: bool, admin_id: UUID,
) -> BulkImportResult:
    return await _bulk_import(
        session, skill="speaking", items=items, mode=mode, on_conflict=on_conflict,
        default_status=default_status, check_images=check_images, admin_id=admin_id,
        schema_cls=SpeakingPromptIn, repo=AdminSpeakingPromptRepo(session),
        create_fn=svc.create_speaking, update_fn=svc.update_speaking,
    )


async def bulk_import_writing(
    session: AsyncSession, *, items: list[dict[str, Any]], mode: str,
    on_conflict: str, default_status: str, check_images: bool, admin_id: UUID,
) -> BulkImportResult:
    return await _bulk_import(
        session, skill="writing", items=items, mode=mode, on_conflict=on_conflict,
        default_status=default_status, check_images=check_images, admin_id=admin_id,
        schema_cls=WritingPromptIn, repo=AdminWritingPromptRepo(session),
        create_fn=svc.create_writing, update_fn=svc.update_writing,
    )
