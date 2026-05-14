from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_redis_pool

router = APIRouter()


@router.get("/health")
async def health(db: Annotated[AsyncSession, Depends(get_db)]) -> JSONResponse:
    """Called by Docker HEALTHCHECK and CI smoke test."""
    db_ok, redis_ok = False, False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    try:
        # Reuse the shared process-wide Redis client instead of opening (and
        # leaking) a fresh connection on every health probe.
        await get_redis_pool().ping()
        redis_ok = True
    except Exception:
        pass

    code = 200 if (db_ok and redis_ok) else 503
    return JSONResponse(status_code=code, content={
        "db": "ok" if db_ok else "error",
        "redis": "ok" if redis_ok else "error",
    })
