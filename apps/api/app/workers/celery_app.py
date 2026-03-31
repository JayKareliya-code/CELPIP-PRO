"""Celery application factory for CELPIP async workers."""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "celpip_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.speaking_tasks",
        "app.workers.writing_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.workers.speaking_tasks.*": {"queue": "speaking"},
        "app.workers.writing_tasks.*": {"queue": "writing"},
    },
    task_acks_late=True,              # acknowledge after completion — safe retries
    task_reject_on_worker_lost=True,  # requeue if worker dies mid-task
    worker_prefetch_multiplier=1,     # one task at a time per worker process
    task_track_started=True,
    result_expires=86_400,            # results expire after 24 h
)
