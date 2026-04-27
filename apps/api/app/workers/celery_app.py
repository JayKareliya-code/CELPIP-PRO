"""Celery application factory for CELPIP async workers."""
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "celpip_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.speaking_tasks",
        "app.workers.writing_tasks",
        "app.workers.mock_exam_tasks",      # isolated speaking mock-exam scoring queue
        "app.workers.writing_mock_tasks",   # isolated writing mock-exam scoring queue
        "app.workers.reconciliation_tasks", # nightly Stripe ↔ DB reconciliation
        "app.workers.metrics_polling",      # Prometheus queue-depth gauge sampler (S2-1)
        "app.workers.export_tasks",         # GDPR data export (S2-4)
        "app.workers.transcode_tasks",      # audio webm → m4a transcoding (S2-7)
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.workers.speaking_tasks.*":         {"queue": "speaking"},
        "app.workers.writing_tasks.*":          {"queue": "writing"},
        "app.workers.mock_exam_tasks.*":        {"queue": "mock_exam"},
        "app.workers.writing_mock_tasks.*":     {"queue": "writing_mock"},
        "app.workers.reconciliation_tasks.*":   {"queue": "reconciliation"},
        "app.workers.export_tasks.*":           {"queue": "export"},
        "app.workers.transcode_tasks.*":        {"queue": "transcode"},
    },
    task_acks_late=True,              # acknowledge after completion — safe retries
    task_reject_on_worker_lost=True,  # requeue if worker dies mid-task
    worker_prefetch_multiplier=1,     # one task at a time per worker process
    task_track_started=True,
    result_expires=86_400,            # results expire after 24 h
    # Write the beat schedule DB to /tmp so the non-root container user
    # (appuser) has write permission on Render and other locked-down hosts.
    beat_schedule_filename="/tmp/celerybeat-schedule",
    beat_schedule={
        # Run reconciliation every night at 02:00 UTC.
        # The beat service must be running (see docker-compose.yml: celery-beat).
        "reconcile-stripe-nightly": {
            "task": "app.workers.reconciliation_tasks.reconcile_stripe_plans",
            "schedule": crontab(hour=2, minute=0),
        },
        # Sample Celery queue depths every 30 s → updates celpip_queue_depth gauge.
        "poll-queue-depths": {
            "task": "app.workers.metrics_polling.poll_queue_depths",
            "schedule": 30.0,  # seconds
        },
    },
)
