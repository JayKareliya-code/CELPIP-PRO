from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.deps import engine
from app.core.rate_limit import limiter
from app.core.logging_config import configure_logging
from app.core.middleware import RequestIDMiddleware
from app.api.router import api_router
from app.workers.celery_app import celery_app as _celery_app  # noqa: F401 — ensures shared_task binds to the configured broker

# ── Logging: must be configured before any logger is obtained ─────────────────
configure_logging()

# ── Sentry: initialise if DSN is set; safe to skip in dev ────────────────────
_sentry_dsn = getattr(settings, "SENTRY_DSN", "")
if _sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_sdk.init(
        dsn=_sentry_dsn,
        environment=settings.APP_ENV,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
            CeleryIntegration(),
            RedisIntegration(),
        ],
        # Don't send PII (email, IP) to Sentry by default
        send_default_pii=False,
        # 10% of transactions traced in production to limit quota usage
        traces_sample_rate=0.1 if settings.APP_ENV == "production" else 1.0,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title    = settings.APP_NAME,
        version  = "1.0.0",
        docs_url = "/docs" if settings.DEBUG else None,
        lifespan = lifespan,
    )

    # ── Request-ID: first middleware so the ID is available for all subsequent layers ──
    app.add_middleware(RequestIDMiddleware)

    # ── Rate limiting ─────────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # ── CORS ──────────────────────────────────────────────────────────────────
    allowed_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allowed_headers = [
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "Accept",
        "Origin",
        "X-Request-ID",
        "X-User-Date",        # sent by apiFetch for streak/timezone logic
        "Stripe-Signature",
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=allowed_methods,
        allow_headers=allowed_headers,
        expose_headers=["X-Request-ID"],   # allow clients to read the request ID
        max_age=600,
    )

    app.include_router(api_router, prefix=settings.API_V1_PREFIX)
    return app


app = create_app()
