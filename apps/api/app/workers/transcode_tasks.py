"""
app/workers/transcode_tasks.py — Audio transcoding webm → m4a.

After a speaking or mock-exam attempt is submitted, this task converts the
original .webm recording to .m4a (AAC 64 kbps) using ffmpeg.  The m4a key
is stored in audio_m4a_s3_key so iOS Safari can play the audio in reports.

Requirements:
  • ffmpeg must be installed in the container (see Dockerfile).
  • The transcode queue must be registered in celery_app.py.

S3 layout (transcode mirrors the original key with a .m4a suffix):
    Original:   audio/{user_id}/{attempt_id}.webm
    Transcoded: audio/{user_id}/{attempt_id}.m4a
"""
from __future__ import annotations

import os
import subprocess
import tempfile
import uuid
from typing import Literal

import structlog
from celery import shared_task
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.storage.presigner import get_s3_client
from app.workers._sync_db import get_sync_engine

log = structlog.get_logger(__name__)

AttemptType = Literal["speaking", "mock_exam"]

_TABLE_MAP: dict[AttemptType, tuple[str, str]] = {
    "speaking":  ("speaking_attempts", "attempt_id"),
    "mock_exam": ("mock_exam_task_attempts", "id"),
}


@shared_task(
    name="app.workers.transcode_tasks.transcode_audio_to_m4a",
    queue="transcode",
    bind=True,
    acks_late=True,
    max_retries=3,
    default_retry_delay=30,
)
def transcode_audio_to_m4a(
    self,  # noqa: ANN001
    attempt_id: str,
    s3_key_webm: str,
    attempt_type: AttemptType = "speaking",
) -> str:
    """
    Download .webm from S3, transcode to .m4a via ffmpeg, re-upload.

    Args:
        attempt_id:   UUID of the SpeakingAttempt or MockExamTaskAttempt row.
        s3_key_webm:  S3 object key of the source .webm file.
        attempt_type: "speaking" or "mock_exam" — selects the target table.

    Returns:
        The S3 key of the uploaded .m4a file.
    """
    s3 = get_s3_client()
    m4a_key = s3_key_webm.rsplit(".", 1)[0] + ".m4a"
    log.info("transcode: starting", attempt_id=attempt_id, src=s3_key_webm)

    with tempfile.TemporaryDirectory() as tmpdir:
        webm_path = os.path.join(tmpdir, "input.webm")
        m4a_path  = os.path.join(tmpdir, "output.m4a")

        # ── Download source webm ────────────────────────────────────────────
        try:
            s3.download_file(settings.S3_BUCKET_NAME, s3_key_webm, webm_path)
        except Exception as exc:
            log.error("transcode: download failed", key=s3_key_webm, error=str(exc))
            raise self.retry(exc=exc)

        # ── Transcode with ffmpeg ───────────────────────────────────────────
        cmd = [
            "ffmpeg", "-y",
            "-i", webm_path,
            "-c:a", "aac",
            "-b:a", "64k",
            "-vn",             # strip video/thumbnails if any
            m4a_path,
        ]
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
            )
            if result.returncode != 0:
                raise RuntimeError(
                    f"ffmpeg exited {result.returncode}: {result.stderr[-500:]}"
                )
        except subprocess.TimeoutExpired as exc:
            log.error("transcode: ffmpeg timeout", attempt_id=attempt_id)
            raise self.retry(exc=exc)
        except Exception as exc:
            log.error("transcode: ffmpeg failed", error=str(exc))
            raise self.retry(exc=exc)

        # ── Upload m4a ──────────────────────────────────────────────────────
        try:
            s3.upload_file(
                m4a_path,
                settings.S3_BUCKET_NAME,
                m4a_key,
                ExtraArgs={"ContentType": "audio/mp4"},
            )
        except Exception as exc:
            log.error("transcode: upload failed", key=m4a_key, error=str(exc))
            raise self.retry(exc=exc)

    log.info("transcode: uploaded m4a", key=m4a_key)

    # ── Update DB ───────────────────────────────────────────────────────────
    table, id_col = _TABLE_MAP.get(attempt_type, ("speaking_attempts", "attempt_id"))
    engine = get_sync_engine()
    with Session(engine) as db:
        db.execute(
            text(
                f"UPDATE {table} SET audio_m4a_s3_key = :key "  # noqa: S608
                f"WHERE {id_col} = :id"
            ),
            {"key": m4a_key, "id": uuid.UUID(attempt_id)},
        )
        db.commit()

    log.info("transcode: DB updated", attempt_id=attempt_id, m4a_key=m4a_key)
    return m4a_key
