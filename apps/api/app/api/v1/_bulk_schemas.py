"""Pydantic schemas for the admin prompt bulk-import endpoints.

The import is deliberately a two-phase, all-or-nothing flow:

  * mode="validate"  → dry run. Every row is schema-validated and slug-checked,
                       a per-row error report is returned, NOTHING is written.
  * mode="commit"    → re-validate, then (only if zero errors) write every row
                       inside a single transaction. One bad row aborts the whole
                       batch — there are never partial imports.

`items` is typed as raw dicts (not list[SpeakingPromptIn]) on purpose: validating
each row individually lets us return which row failed and why, instead of a single
opaque 422 for the whole request.
"""
from typing import Any, Literal

from pydantic import BaseModel, Field

# Upper bound on a single synchronous batch. The UI is expected to send hundreds;
# this cap protects the request from becoming an unbounded, request-timeout-busting
# payload. Larger jobs should be split into multiple batches.
MAX_BULK_ITEMS = 1000


class BulkImportIn(BaseModel):
    mode: Literal["validate", "commit"] = "validate"
    on_conflict: Literal["error", "skip", "update"] = "error"
    default_status: Literal["draft", "published", "archived"] = "draft"
    # When True (default), every referenced image key (Task 5 option cards and
    # Task 3/4/8 scene images) is HEAD-checked against S3; a row pointing at a
    # missing object is rejected. Set False to import references before the
    # images are uploaded.
    check_images: bool = True
    items: list[dict[str, Any]] = Field(..., min_length=1, max_length=MAX_BULK_ITEMS)


class BulkRowError(BaseModel):
    index: int                     # 0-based position of the row in `items`
    slug: str | None = None
    title: str | None = None
    errors: list[str]


class BulkImportResult(BaseModel):
    skill: Literal["speaking", "writing"]
    mode: Literal["validate", "commit"]
    ok: bool                       # True when there are zero row errors
    total: int                     # rows received
    valid: int                     # rows that passed validation (total - errored)
    to_create: int                 # rows that WOULD be created
    to_update: int                 # rows that WOULD update an existing prompt (on_conflict=update)
    to_skip: int                   # rows that WOULD be skipped (on_conflict=skip)
    created: int = 0               # rows actually created (commit only)
    updated: int = 0               # rows actually updated (commit only)
    skipped: int = 0               # rows actually skipped (commit only)
    batch_id: str | None = None    # set only after a successful commit
    errors: list[BulkRowError] = []
    warnings: list[str] = []       # non-blocking notes (e.g. image existence unverifiable)
