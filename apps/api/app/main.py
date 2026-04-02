from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.deps import engine
from app.api.router import api_router
from app.workers.celery_app import celery_app as _celery_app  # noqa: F401 — ensures shared_task binds to the configured broker

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()    # clean connection pool shutdown

def create_app() -> FastAPI:
    app = FastAPI(
        title    = settings.APP_NAME,
        version  = "1.0.0",
        docs_url = "/docs" if settings.DEBUG else None,
        lifespan = lifespan,
    )
    app.add_middleware(CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True, 
        allow_methods=["*"], 
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)
    return app

app = create_app()
