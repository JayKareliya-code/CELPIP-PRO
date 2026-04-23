"""
S3 / Cloudflare R2 presigned URL helpers.

Public surface:
  generate_presigned_upload  — admin image/asset upload (PUT presign)
  generate_presigned_get     — short-lived authenticated GET URL (preview / display)
  build_public_url           — deterministic public URL from an S3 key
  download_from_s3           — Celery pipeline audio fetch (async GET)
"""
from __future__ import annotations

import hashlib
import logging
from functools import lru_cache
from typing import TYPE_CHECKING

import boto3
import httpx
from botocore.config import Config as BotoCoreConfig

from app.core.config import settings

if TYPE_CHECKING:
    import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

# Safety margin: cache for slightly less than the URL's lifetime so we never
# hand out a near-expired URL to a client that may sit on it for a few seconds.
_PRESIGN_CACHE_SAFETY_MARGIN_S = 300
# Below this floor it isn't worth caching — and a negative TTL would be invalid.
_PRESIGN_CACHE_MIN_TTL_S = 60


@lru_cache(maxsize=1)
def _get_s3_client():
    """Cached boto3 S3 client (supports AWS S3 + Cloudflare R2)."""
    kwargs: dict = dict(
        region_name=settings.S3_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=BotoCoreConfig(signature_version="s3v4"),
    )
    if settings.S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
    return boto3.client("s3", **kwargs)


def build_public_url(s3_key: str) -> str:
    """Return the public URL for an uploaded S3 object.

    Uses the custom R2/CDN endpoint when configured, otherwise the AWS regional URL.
    """
    base = settings.S3_ENDPOINT_URL or f"https://s3.{settings.S3_REGION}.amazonaws.com"
    return f"{base}/{settings.S3_BUCKET_NAME}/{s3_key}"


def generate_presigned_upload(key: str, content_type: str, expires_in: int = 300) -> str:
    """Return a presigned S3 PUT URL.

    Boto3 presigning is a pure local HMAC — no network call.
    The browser PUTs the file body directly to this URL.

    Args:
        key:          Full S3 key, e.g. 'speaking-task-3/uuid-scene.jpg'
        content_type: MIME type the browser must include as Content-Type on the PUT.
        expires_in:   Lifetime in seconds (default 5 min).
    """
    return _get_s3_client().generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": key, "ContentType": content_type},
        ExpiresIn=expires_in,
    )


def generate_presigned_get(key: str, expires_in: int = 3600) -> str:
    """Return a presigned S3 GET URL for browser image display.

    Default expiry is 1 hour — long enough for an admin editing session.
    Use this for any image that lives in a private bucket (i.e. all buckets
    unless you explicitly set a public-read bucket policy).

    Args:
        key:        Full S3 key, e.g. 'speaking-task-3/uuid-scene.jpg'
        expires_in: Lifetime in seconds (default 1 hour).
    """
    return _get_s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )


async def generate_presigned_get_cached(
    key: str,
    expires_in: int,
    *,
    redis: "aioredis.Redis",
) -> str:
    """Redis-cached variant of :func:`generate_presigned_get` (S2-12).

    `GET /speaking/tasks` re-signs every prompt image on every request. The
    presigning itself is local HMAC (cheap), but the per-request fan-out
    inflates response time and CPU when the prompt list is long. Caching the
    URL string for slightly less than its TTL lets repeated callers share one
    signing pass.

    On any Redis failure we silently fall back to direct presigning — image
    delivery must never depend on Redis being healthy.
    """
    cache_ttl = expires_in - _PRESIGN_CACHE_SAFETY_MARGIN_S
    if cache_ttl < _PRESIGN_CACHE_MIN_TTL_S:
        return generate_presigned_get(key=key, expires_in=expires_in)

    cache_key = f"presign:get:{expires_in}:{hashlib.md5(key.encode()).hexdigest()}"

    try:
        cached = await redis.get(cache_key)
        if cached:
            return cached
    except Exception:
        logger.debug("Redis GET failed for presign cache; falling back", exc_info=True)
        return generate_presigned_get(key=key, expires_in=expires_in)

    url = generate_presigned_get(key=key, expires_in=expires_in)

    try:
        await redis.set(cache_key, url, ex=cache_ttl)
    except Exception:
        logger.debug("Redis SET failed for presign cache; ignoring", exc_info=True)

    return url


def _generate_download_url(s3_key: str) -> str:
    """Short-lived presigned GET URL (Celery pipeline internal use only)."""
    return generate_presigned_get(key=s3_key, expires_in=300)


async def download_from_s3(s3_key: str) -> bytes:
    """Download audio bytes from S3 via a presigned GET URL (async).

    Used by the Celery speaking pipeline before Whisper STT.
    Raises RuntimeError if AWS credentials are not configured.
    """
    if not settings.AWS_ACCESS_KEY_ID or settings.AWS_ACCESS_KEY_ID == "REPLACE_ME":
        raise RuntimeError(
            "AWS_ACCESS_KEY_ID is not configured. "
            "Set your S3/R2 credentials in .env before running the speaking pipeline."
        )
    url = _generate_download_url(s3_key)
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    logger.debug("Downloaded %d bytes from S3 key=%s", len(resp.content), s3_key)
    return resp.content
