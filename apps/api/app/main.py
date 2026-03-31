from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.deps import engine
from app.api.router import api_router

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
