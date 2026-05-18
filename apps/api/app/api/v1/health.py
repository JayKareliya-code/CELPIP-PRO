from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_redis_pool

router = APIRouter()


# ── Liveness ─────────────────────────────────────────────────────────────────
# A liveness probe MUST only fail when the *process itself* is unhealthy.
# Probing dependencies (Postgres, Redis) from a liveness probe is a classic
# anti-pattern: a brief Redis blip will restart the container even though the
# Python process is healthy and would have recovered on its own. We keep this
# endpoint as a dependency-free 200.

@router.get("/health/live", include_in_schema=False)
async def live() -> JSONResponse:
    """Liveness probe — returns 200 as long as the event loop is running.

    Wire this to the Kubernetes ``livenessProbe`` and the Docker
    ``HEALTHCHECK``. Restarts triggered here should always indicate a truly
    broken process (deadlock, OOM, event-loop stuck).
    """
    return JSONResponse({"status": "live"})


# ── Readiness ────────────────────────────────────────────────────────────────
# A readiness probe SHOULD fail when the process can't serve requests yet —
# DB or Redis unreachable means our routes will 5xx, so the load balancer
# should stop sending us traffic. Once the dependency recovers, this flips
# back to 200 and traffic resumes WITHOUT restarting the container.

@router.get("/health/ready")
async def ready(db: Annotated[AsyncSession, Depends(get_db)]) -> JSONResponse:
    """Readiness probe — verifies DB + Redis connectivity.

    Wire this to the Kubernetes ``readinessProbe`` / load-balancer health
    check. A failure here removes the pod from the LB rotation but does
    NOT restart it; the pod returns to rotation when dependencies recover.
    """
    db_ok, redis_ok = False, False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    try:
        await get_redis_pool().ping()
        redis_ok = True
    except Exception:
        pass

    code = 200 if (db_ok and redis_ok) else 503
    return JSONResponse(status_code=code, content={
        "db":    "ok" if db_ok else "error",
        "redis": "ok" if redis_ok else "error",
    })


# ── Backwards-compatible /health alias ───────────────────────────────────────
# Existing Docker / CI configs probe /health. Keep that working but route it
# to the readiness check so behaviour is unchanged for callers that don't
# yet know about /live vs /ready.

@router.get("/health")
async def health(db: Annotated[AsyncSession, Depends(get_db)]) -> JSONResponse:
    """Compatibility alias — equivalent to /health/ready."""
    return await ready(db)
