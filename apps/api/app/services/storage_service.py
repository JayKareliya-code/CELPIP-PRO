"""S3 / Cloudflare R2 pre-signed URL generation for audio uploads and playback."""
from functools import lru_cache
import boto3
from botocore.config import Config as BotoCoreConfig
from app.core.config import settings


@lru_cache(maxsize=1)
def _get_s3_client():
    """Return a cached boto3 S3 client.

    Supports both AWS S3 and Cloudflare R2 via S3_ENDPOINT_URL config override.
    Always uses the region-specific endpoint for AWS S3 so presigned PUT URLs
    go directly to the correct datacenter — avoiding 307 redirects that strip
    CORS headers in browsers.
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
