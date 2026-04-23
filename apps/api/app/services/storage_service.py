"""S3 / Cloudflare R2 pre-signed URL generation for audio uploads and playback."""
import boto3
from botocore.config import Config as BotoCoreConfig
from app.core.config import settings


def _get_s3_client():
    """Return a boto3 S3 client built from current settings.

    Supports both AWS S3 and Cloudflare R2 via S3_ENDPOINT_URL config override.
    Always uses the region-specific endpoint for AWS S3 so presigned PUT URLs
    go directly to the correct datacenter — avoiding 307 redirects that strip
    CORS headers in browsers.

    Not cached: presigned URL generation is a local HMAC signing operation with no
    network call, so the client construction cost is negligible. Caching with
    lru_cache bakes in credentials at startup and silently breaks when AWS credentials
    are rotated (e.g., IAM role refresh, secret rotation).
    """
    # Default to regional endpoint to prevent browser CORS issues on redirects
    endpoint = settings.S3_ENDPOINT_URL or f"https://s3.{settings.S3_REGION}.amazonaws.com"

    kwargs: dict = dict(
        region_name=settings.S3_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=BotoCoreConfig(signature_version="s3v4"),
        endpoint_url=endpoint,
    )
    return boto3.client("s3", **kwargs)


def generate_upload_url(user_id: str, attempt_id: str) -> tuple[str, str]:
    """Generate a pre-signed S3 PUT URL for audio file upload.

    Returns:
        (presigned_url, s3_key) — the frontend should PUT the audio blob to the URL.

    Audio key format: audio/{user_id}/{attempt_id}.webm
    """
    s3_key = f"{settings.S3_AUDIO_PREFIX}{user_id}/{attempt_id}.webm"
    url: str = _get_s3_client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.S3_BUCKET_NAME,
            "Key": s3_key,
            "ContentType": "audio/webm",
        },
        ExpiresIn=settings.S3_UPLOAD_EXPIRY_SECS,
    )
    return url, s3_key


def generate_download_url(s3_key: str) -> str:
    """Generate a pre-signed S3 GET URL for authenticated audio playback.

    Used by the report page in Phase 2 to stream audio back to the user.
    """
    url: str = _get_s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=settings.S3_DOWNLOAD_EXPIRY_SECS,
    )
    return url


def validate_uploaded_audio(s3_key: str) -> dict:
    """HEAD the uploaded audio object and assert it is present, within the
    allowed size window, and has an audio content-type.

    Raises ``fastapi.HTTPException`` with a descriptive message when the object
    is missing, too small, too large, or the wrong type. Callers should invoke
    this before enqueueing expensive AI scoring work.

    Returns the HEAD response dict (ContentLength, ContentType, etc.).
    """
    from fastapi import HTTPException
    from botocore.exceptions import ClientError

    client = _get_s3_client()
    try:
        head = client.head_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
    except ClientError as exc:
        code = (exc.response or {}).get("Error", {}).get("Code") if hasattr(exc, "response") else ""
        if code in ("404", "NoSuchKey", "NotFound"):
            raise HTTPException(
                status_code=400,
                detail="Audio upload not found. Please re-upload and try again.",
            )
        raise HTTPException(
            status_code=502, detail="Could not verify audio upload."
        ) from exc

    size = int(head.get("ContentLength") or 0)
    if size < settings.AUDIO_MIN_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Audio file is too small ({size} bytes).",
        )
    if size > settings.AUDIO_MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Audio file exceeds the {settings.AUDIO_MAX_BYTES // (1024 * 1024)} MB "
                "limit. Please record a shorter response."
            ),
        )

    content_type = (head.get("ContentType") or "").lower()
    if content_type and not content_type.startswith("audio/"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio content-type: {content_type!r}.",
        )

    return head
