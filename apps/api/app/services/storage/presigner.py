"""
S3 / Cloudflare R2 presigned URL helpers + synchronous audio download.

generate_upload_url / generate_download_url remain in storage_service.py
(Phase 1 public surface). This module adds the internal download helper
used by the Celery speaking pipeline to fetch audio bytes before STT.

Design notes:
  - download_from_s3 is async (uses httpx) so it can run inside asyncio.run()
    in the Celery worker without blocking the thread pool.
  - The S3 key is taken from speaking_attempts.audio_s3_key; it already
    encodes the full prefix (audio/{user_id}/{attempt_id}.webm).
  - On error, the exception propagates — the Celery task catches it and retries.
"""
from __future__ import annotations

import logging
from functools import lru_cache

import boto3
import httpx
from botocore.config import Config as BotoCoreConfig

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_s3_client():
    """Cached boto3 S3 client (supports AWS + Cloudflare R2 via endpoint override)."""
    kwargs: dict = dict(
        region_name=settings.S3_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=BotoCoreConfig(signature_version="s3v4"),
    )
    if settings.S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
    return boto3.client("s3", **kwargs)


def _generate_download_url(s3_key: str) -> str:
    """Generate a short-lived presigned GET URL for the given S3 key."""
    return _get_s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=300,  # 5 minutes — enough to complete STT
    )


async def download_from_s3(s3_key: str) -> bytes:
    """
    Download audio bytes from S3 using a short-lived presigned URL.

    Args:
        s3_key: The S3 object key stored in speaking_attempts.audio_s3_key.
                Example: "audio/user-uuid/attempt-uuid.webm"

    Returns:
        Raw audio bytes.

    Raises:
        httpx.HTTPStatusError: If the download fails (caller should retry).
        RuntimeError:          If AWS credentials are missing.
    """
    if not settings.AWS_ACCESS_KEY_ID or settings.AWS_ACCESS_KEY_ID == "REPLACE_ME":
        raise RuntimeError(
            "AWS_ACCESS_KEY_ID is not configured. "
            "Set your S3/R2 credentials in .env before running the speaking pipeline."
        )

    url = _generate_download_url(s3_key)
    logger.debug("Downloading audio from S3: key=%s", s3_key)

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        audio_bytes = resp.content

    logger.debug("Audio downloaded: %d bytes from key=%s", len(audio_bytes), s3_key)
    return audio_bytes
