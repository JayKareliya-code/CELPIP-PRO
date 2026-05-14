"""
app/workers/export_tasks.py — GDPR data export Celery task.

Triggered by POST /users/me/export.  Downloads all user data, zips it
in-memory, uploads to S3, generates a 24-hour presigned URL, and updates
the export_jobs row.

S3 layout:
    exports/{user_id}/{job_id}.zip
"""
from __future__ import annotations

import io
import json
import uuid
import zipfile
from datetime import datetime, timedelta, timezone

import structlog
from celery import shared_task
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.storage.presigner import get_s3_client
from app.workers._sync_db import get_sync_engine

log = structlog.get_logger(__name__)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _rows_to_list(rows) -> list[dict]:
    """Convert SQLAlchemy RowMapping results to plain dicts."""
    return [dict(r) for r in rows]


def _serialize(obj):
    """JSON default handler for UUID / datetime objects."""
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


# Columns excluded from the export — internal system flags, not the user's
# personal data. Add new internal-only columns here as they are introduced so
# a future column can never silently leak into the SELECT * dumps below.
_EXCLUDE_COLUMNS: dict[str, set[str]] = {
    "user": {"is_admin"},
}


# ── Task ──────────────────────────────────────────────────────────────────────

@shared_task(
    name="app.workers.export_tasks.build_user_export",
    bind=True,
    acks_late=True,
    max_retries=2,
    default_retry_delay=60,
)
def build_user_export(self, job_id: str, user_id: str) -> None:  # noqa: ANN001
    """
    Build and upload a GDPR data export zip for a user.

    Steps:
      1. Set export_jobs.status = 'processing'
      2. Collect all user data from DB (attempts, scores, ai_cost_log, etc.)
      3. Serialize each table to JSON, bundle into a zip
      4. Upload zip to S3: exports/{user_id}/{job_id}.zip
      5. Generate 24h presigned GET URL
      6. Update export_jobs: status='complete', s3_url=..., expires_at=...
    On failure: status='failed', error_message=...
    """
    engine = get_sync_engine()
    uid = uuid.UUID(user_id)
    jid = uuid.UUID(job_id)
    log.info("export: starting", job_id=job_id, user_id=user_id)

    with Session(engine) as db:
        # ── 1. Mark processing ─────────────────────────────────────────────
        db.execute(
            text("UPDATE export_jobs SET status='processing' WHERE id = :id"),
            {"id": jid},
        )
        db.commit()

        try:
            # ── 2. Collect data ────────────────────────────────────────────
            tables: dict[str, list[dict]] = {}

            # User profile
            tables["user"] = _rows_to_list(
                db.execute(text("SELECT * FROM users WHERE id = :uid"), {"uid": uid}).mappings()
            )

            # Attempts
            tables["attempts"] = _rows_to_list(
                db.execute(
                    text("SELECT * FROM attempts WHERE user_id = :uid ORDER BY created_at"),
                    {"uid": uid},
                ).mappings()
            )

            # Speaking attempt details
            tables["speaking_attempts"] = _rows_to_list(
                db.execute(
                    text(
                        "SELECT sa.* FROM speaking_attempts sa "
                        "JOIN attempts a ON a.id = sa.attempt_id "
                        "WHERE a.user_id = :uid"
                    ),
                    {"uid": uid},
                ).mappings()
            )

            # Writing attempt details
            tables["writing_attempts"] = _rows_to_list(
                db.execute(
                    text(
                        "SELECT wa.* FROM writing_attempts wa "
                        "JOIN attempts a ON a.id = wa.attempt_id "
                        "WHERE a.user_id = :uid"
                    ),
                    {"uid": uid},
                ).mappings()
            )

            # Mock exam attempts
            tables["mock_exam_task_attempts"] = _rows_to_list(
                db.execute(
                    text("SELECT * FROM mock_exam_task_attempts WHERE user_id = :uid ORDER BY created_at"),
                    {"uid": uid},
                ).mappings()
            )

            # Score reports
            tables["score_reports"] = _rows_to_list(
                db.execute(
                    text(
                        "SELECT sr.* FROM score_reports sr "
                        "JOIN attempts a ON a.id = sr.attempt_id "
                        "WHERE a.user_id = :uid"
                    ),
                    {"uid": uid},
                ).mappings()
            )

            # AI cost log
            tables["ai_cost_log"] = _rows_to_list(
                db.execute(
                    text("SELECT * FROM ai_cost_log WHERE user_id = :uid ORDER BY created_at"),
                    {"uid": uid},
                ).mappings()
            )

            # Subscription info
            tables["subscriptions"] = _rows_to_list(
                db.execute(
                    text("SELECT * FROM subscriptions WHERE user_id = :uid"),
                    {"uid": uid},
                ).mappings()
            )

            # ── 3. Zip in-memory ───────────────────────────────────────────
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
                for table_name, rows in tables.items():
                    drop = _EXCLUDE_COLUMNS.get(table_name)
                    if drop:
                        rows = [
                            {k: v for k, v in r.items() if k not in drop}
                            for r in rows
                        ]
                    zf.writestr(
                        f"{table_name}.json",
                        json.dumps(rows, default=_serialize, indent=2),
                    )
                # Human-readable README
                zf.writestr(
                    "README.txt",
                    (
                        f"CELPIPBro — Data Export\n"
                        f"User ID:    {user_id}\n"
                        f"Job ID:     {job_id}\n"
                        f"Generated:  {datetime.now(timezone.utc).isoformat()}\n\n"
                        "Files in this archive:\n"
                        + "\n".join(f"  {t}.json" for t in tables)
                        + "\n\nThis archive expires 24 hours after generation.\n"
                    ),
                )
            buf.seek(0)

            # ── 4. Upload to S3 ────────────────────────────────────────────
            s3 = get_s3_client()
            s3_key = f"exports/{user_id}/{job_id}.zip"
            s3.upload_fileobj(
                buf,
                settings.S3_BUCKET_NAME,
                s3_key,
                ExtraArgs={"ContentType": "application/zip"},
            )
            log.info("export: uploaded to S3", key=s3_key)

            # ── 5. Presigned GET URL (24h) ─────────────────────────────────
            download_url = s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
                ExpiresIn=86_400,  # 24 hours
            )
            expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

            # ── 6. Mark complete ───────────────────────────────────────────
            db.execute(
                text(
                    "UPDATE export_jobs "
                    "SET status='complete', s3_url=:url, expires_at=:exp "
                    "WHERE id = :id"
                ),
                {"url": download_url, "exp": expires_at, "id": jid},
            )
            db.commit()
            log.info("export: complete", job_id=job_id)

        except Exception as exc:  # noqa: BLE001
            log.exception("export: failed", job_id=job_id, error=str(exc))
            db.execute(
                text(
                    "UPDATE export_jobs "
                    "SET status='failed', error_message=:msg "
                    "WHERE id = :id"
                ),
                {"msg": str(exc)[:1000], "id": jid},
            )
            db.commit()
            raise self.retry(exc=exc)


@shared_task(
    name="app.workers.export_tasks.purge_expired_exports",
    queue="export",
    acks_late=True,
    max_retries=0,
)
def purge_expired_exports() -> dict:
    """Delete GDPR export zips whose 24-hour download window has passed.

    The presigned URL expires after 24 h but the S3 object itself does not —
    without this nightly sweep, export archives (full copies of a user's
    personal data) would accumulate in the bucket indefinitely.

    Runs via Celery Beat (see celery_app.py). Idempotent: an already-purged
    job is skipped because its status is no longer 'complete'.
    """
    engine = get_sync_engine()
    s3 = get_s3_client()
    purged = 0

    with Session(engine) as db:
        rows = db.execute(
            text(
                "SELECT id, user_id FROM export_jobs "
                "WHERE status = 'complete' "
                "AND expires_at IS NOT NULL AND expires_at < NOW()"
            )
        ).mappings().all()

        for row in rows:
            s3_key = f"exports/{row['user_id']}/{row['id']}.zip"
            try:
                s3.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
            except Exception as exc:
                log.warning(
                    "purge_expired_exports: S3 delete failed",
                    key=s3_key, error=str(exc),
                )
                continue
            db.execute(
                text(
                    "UPDATE export_jobs SET status='expired', s3_url=NULL "
                    "WHERE id = :id"
                ),
                {"id": row["id"]},
            )
            purged += 1

        db.commit()

    log.info("purge_expired_exports: done", purged=purged, candidates=len(rows))
    return {"purged": purged}
