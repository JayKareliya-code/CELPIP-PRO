from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis

from app.core.config import settings
from app.core.deps import get_db

router = APIRouter()

# Health doesn't need Redis ping actually, unless we configure Redis, but let's emulate the plan:
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
        r = redis.from_url(settings.REDIS_URL)
        await r.ping()
        redis_ok = True
        await r.aclose()
    except Exception:
        pass
        
    code = 200 if (db_ok and redis_ok) else 503
    return JSONResponse(status_code=code, content={
        "db": "ok" if db_ok else "error",
        "redis": "ok" if redis_ok else "error",
    })
