"""Shared helpers for the admin prompts router."""
from urllib.parse import urlparse

from app.core.config import settings
from app.services.sanitizer import sanitize_rich_text, sanitize_plain_text
from app.services.storage.presigner import generate_presigned_get


_RICH_TEXT_KEYS = {
    "prompt_text",
    "sample_response_text",
    "sample_response_band12",
    "template_hint",
    "intro_template",
    "conclusion_template",
}
_PLAIN_TEXT_KEYS = {"title"}
_LIST_OF_STRINGS_KEYS = {"vocabulary_tips", "connector_phrases", "idea_hints"}


def extract_s3_key(stored_url: str) -> str:
    """Extract a bare S3 key from any URL format produced by boto3 / build_public_url.

    Handles raw keys, path-style URLs, virtual-hosted URLs, and presigned
    query params (stripped automatically).

    Raises ValueError for empty input.
    """
    if not stored_url:
        raise ValueError("Empty URL")

    if not stored_url.startswith("http"):
        return stored_url.split("?")[0]

    parsed = urlparse(stored_url)
    host = parsed.hostname or ""
    path = parsed.path
    bucket = settings.S3_BUCKET_NAME

    if host.startswith(f"{bucket}."):
        return path.lstrip("/")

    bucket_prefix = f"/{bucket}/"
    if path.startswith(bucket_prefix):
        return path[len(bucket_prefix):]

    return path.lstrip("/")


def remap_prompt_data(data: dict) -> dict:
    """Normalise frontend field names to DB column names before calling the service.

    - Renames sample_response_band12 → sample_response_text.
    - Strips context_image_url to a bare S3 key.
    - Strips choice_options[*].image_url and curveball_option.image_url to bare S3 keys.
    - Enforces has_parts=True / part_count=2 for Task 5.
    """
    if "sample_response_band12" in data:
        data["sample_response_text"] = data.pop("sample_response_band12")

    if url := data.get("context_image_url"):
        try:
            data["context_image_url"] = extract_s3_key(url)
        except Exception:
            data["context_image_url"] = url.split("?")[0]

    # Strip image_url inside Task 5 option cards to bare S3 keys so the DB
    # only ever stores raw keys — never full URLs or expired presigned URLs.
    choice_options = data.get("choice_options")
    if choice_options and isinstance(choice_options, list):
        stripped = []
        for opt in choice_options:
            if isinstance(opt, dict) and opt.get("image_url"):
                try:
                    opt = {**opt, "image_url": extract_s3_key(opt["image_url"])}
                except Exception:
                    opt = {**opt, "image_url": opt["image_url"].split("?")[0]}
            stripped.append(opt)
        data["choice_options"] = stripped

    curveball = data.get("curveball_option")
    if isinstance(curveball, dict) and curveball.get("image_url"):
        try:
            data["curveball_option"] = {**curveball, "image_url": extract_s3_key(curveball["image_url"])}
        except Exception:
            data["curveball_option"] = {**curveball, "image_url": curveball["image_url"].split("?")[0]}

    if data.get("task_number") == 5:
        data["has_parts"] = True
        data["part_count"] = 2

    # ── Sanitize admin-authored free-text fields (S2-5) ───────────────────────
    for key in _RICH_TEXT_KEYS:
        if key in data and isinstance(data[key], str):
            data[key] = sanitize_rich_text(data[key])
    for key in _PLAIN_TEXT_KEYS:
        if key in data and isinstance(data[key], str):
            data[key] = sanitize_plain_text(data[key])
    for key in _LIST_OF_STRINGS_KEYS:
        if key in data and isinstance(data[key], list):
            data[key] = [sanitize_plain_text(v) if isinstance(v, str) else v for v in data[key]]

    return data


def sign_prompt_dict(d: dict) -> dict:
    """Replace stored S3 keys / URLs with 1-hour presigned GET URLs.

    Covers:
      - context_image_url        (Tasks 3, 4, 8)
      - choice_options[*].image_url  (Task 5 option cards)
      - curveball_option.image_url   (Task 5 curveball card)

    Falls back silently to the raw stored value when S3 is unavailable.
    """
    raw = d.get("context_image_url")
    if raw:
        try:
            d["context_image_url"] = generate_presigned_get(key=extract_s3_key(raw), expires_in=3600)
        except Exception:
            pass

    choice_options = d.get("choice_options")
    if choice_options and isinstance(choice_options, list):
        signed = []
        for opt in choice_options:
            if isinstance(opt, dict) and opt.get("image_url"):
                try:
                    opt = {**opt, "image_url": generate_presigned_get(
                        key=extract_s3_key(opt["image_url"]), expires_in=3600
                    )}
                except Exception:
                    pass
            signed.append(opt)
        d["choice_options"] = signed

    curveball = d.get("curveball_option")
    if isinstance(curveball, dict) and curveball.get("image_url"):
        try:
            d["curveball_option"] = {**curveball, "image_url": generate_presigned_get(
                key=extract_s3_key(curveball["image_url"]), expires_in=3600
            )}
        except Exception:
            pass

    return d
