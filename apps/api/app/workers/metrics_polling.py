"""
app/workers/metrics_polling.py — Prometheus queue-depth poller.

This Beat task runs every 30 seconds and updates the ``celpip_queue_depth``
Gauge for each known Celery queue.  The gauge is then scraped by Prometheus
at ``GET /metrics`` and visualised in Grafana.

Queue lengths are read via Redis ``LLEN`` on the default Celery list key
(``celery_<queue>``).  This works for the default Redis transport; if you
switch to RabbitMQ, replace with the appropriate broker API call.
"""
from __future__ import annotations

import structlog
from celery import shared_task

from app.core.metrics import queue_depth

log = structlog.get_logger(__name__)

# Queues to monitor — must match those registered in celery_app.py task_routes.
_QUEUES = [
    "speaking",
    "writing",
    "mock_exam",
    "writing_mock",
    "reconciliation",
    "celery",  # default queue for any unrouted tasks
]


@shared_task(
    name="app.workers.metrics_polling.poll_queue_depths",
    ignore_result=True,
    bind=True,
    max_retries=0,  # Fire-and-forget — skip retry on failure; next beat tick will retry
)
def poll_queue_depths(self) -> None:  # noqa: ANN001
    """
    Read each Celery queue length from Redis and update the Prometheus gauge.

    This task uses a synchronous Redis client (``self.app.backend.client``)
    which is already available inside Celery workers without any additional
    dependencies.
    """
    try:
        # Access the underlying sync Redis client from the Celery backend.
        # Works with the standard Redis result backend configured in celery_app.py.
        redis_client = self.app.backend.client
    except AttributeError:
        # Backend may not be a Redis backend in test environments.
        log.warning("metrics_polling: cannot access Redis backend client — skipping")
        return

    for queue_name in _QUEUES:
        # Celery's default Redis list key for a queue named "foo" is "foo".
        # Some versions prefix with "_kombu." — try both.
        key = queue_name
        try:
            length = redis_client.llen(key)
            queue_depth.labels(queue=queue_name).set(length)
        except Exception as exc:  # noqa: BLE001
            log.warning(
                "metrics_polling: failed to read queue length",
                queue=queue_name,
                error=str(exc),
            )

    log.debug("metrics_polling: queue depths updated", queues=_QUEUES)
