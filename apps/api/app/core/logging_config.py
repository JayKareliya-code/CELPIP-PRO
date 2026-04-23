"""
logging_config.py — Structured JSON logging for the CELPIP API.

Configures structlog with a stdlib bridge so:
  • structlog.get_logger() produces JSON-formatted log records.
  • All stdlib logging (FastAPI, SQLAlchemy, Celery, boto3, etc.) is
    captured and routed through the same JSON pipeline.
  • Each log record includes the ``request_id`` context variable when set
    by RequestIDMiddleware.
  • In development (DEBUG=True) logs are human-readable console output.

Call ``configure_logging()`` once at application startup (main.py).
"""
from __future__ import annotations

import logging
import logging.config
import sys
from contextvars import ContextVar

import structlog
from app.core.config import settings

# ── Request-ID context variable ───────────────────────────────────────────────
# Set by RequestIDMiddleware on each request; included in every log record.
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


def _add_request_id(logger, method_name, event_dict):  # noqa: ANN001
    """structlog processor: inject request_id from context variable."""
    event_dict["request_id"] = request_id_ctx.get("-")
    return event_dict


def configure_logging() -> None:
    """Wire structlog + stdlib logging into a unified JSON pipeline.

    Must be called before any other code touches the logging system.
    """
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        _add_request_id,
        structlog.processors.StackInfoRenderer(),
    ]

    if settings.DEBUG:
        # Human-readable console output for local development
        renderer = structlog.dev.ConsoleRenderer()
    else:
        # Machine-parseable JSON for production (CloudWatch / Datadog)
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

    # Reduce noise from chatty libraries
    for noisy in ("httpx", "httpcore", "boto3", "botocore", "s3transfer"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
