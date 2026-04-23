"""
app/core/metrics.py — Prometheus counters/gauges + OpenTelemetry bootstrap.

Prometheus metrics
──────────────────
Import and increment these anywhere in the codebase:

    from app.core.metrics import attempt_total, ai_cost_usd_total

    attempt_total.labels(skill="speaking", status="complete", plan="pro").inc()
    ai_cost_usd_total.labels(model="gpt-4o-mini", operation="score").inc(0.0003)

OpenTelemetry
─────────────
Call once during FastAPI lifespan startup:

    from app.core.metrics import setup_otel
    setup_otel(app)

If OTEL_EXPORTER_OTLP_ENDPOINT is empty the function is a no-op, so it is
safe to call unconditionally in all environments.
"""
from __future__ import annotations

import logging

from prometheus_client import Counter, Gauge

logger = logging.getLogger(__name__)

# ── Prometheus metrics ────────────────────────────────────────────────────────

attempt_total = Counter(
    "celpip_attempt_total",
    "Total practice/mock attempts, partitioned by skill, terminal status, and plan.",
    ["skill", "status", "plan"],
)

ai_cost_usd_total = Counter(
    "celpip_ai_cost_usd_total",
    "Cumulative AI spend in USD, partitioned by model and operation.",
    ["model", "operation"],
)

queue_depth = Gauge(
    "celpip_queue_depth",
    "Current number of tasks waiting in a Celery queue (sampled every 30 s).",
    ["queue"],
)


# ── OpenTelemetry bootstrap ───────────────────────────────────────────────────

def setup_otel(app) -> None:  # noqa: ANN001
    """
    Wire OpenTelemetry tracing into the FastAPI application.

    Reads OTEL_EXPORTER_OTLP_ENDPOINT from settings.  When the value is empty
    (the default) this function is a no-op — no imports are resolved and no
    background threads are started.  Set the variable to your collector
    endpoint (e.g. ``http://jaeger:4317``) to activate tracing.

    Instruments:
      - FastAPI request spans
      - SQLAlchemy query spans (via opentelemetry-instrumentation-sqlalchemy)
    """
    from app.core.config import settings  # local import — avoids circular at module level

    endpoint = getattr(settings, "OTEL_EXPORTER_OTLP_ENDPOINT", "")
    if not endpoint:
        logger.debug("OTel: OTEL_EXPORTER_OTLP_ENDPOINT not set — tracing disabled.")
        return

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.resources import Resource, SERVICE_NAME
    except ImportError as exc:
        logger.warning(
            "OTel: packages not installed (%s). "
            "Add opentelemetry-sdk, opentelemetry-instrumentation-fastapi, "
            "opentelemetry-instrumentation-sqlalchemy, opentelemetry-exporter-otlp "
            "to requirements.txt.",
            exc,
        )
        return

    service_name = getattr(settings, "APP_NAME", "celpip-api")
    resource = Resource.create({SERVICE_NAME: service_name})
    provider = TracerProvider(resource=resource)

    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument()

    logger.info(
        "OTel: tracing enabled — service=%s endpoint=%s", service_name, endpoint
    )
