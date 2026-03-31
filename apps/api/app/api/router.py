from fastapi import APIRouter
from app.api.v1 import health, users, speaking, writing, attempts, admin
from app.api.v1 import reports, history   # Phase 2

api_router = APIRouter()

api_router.include_router(health.router,   tags=["Health"])
api_router.include_router(users.router,    prefix="/users",   tags=["Users"])
api_router.include_router(speaking.router, prefix="/speaking", tags=["Speaking"])
api_router.include_router(writing.router,  prefix="/writing",  tags=["Writing"])
api_router.include_router(attempts.router, tags=["Attempts"])
api_router.include_router(admin.router,    prefix="/admin",    tags=["Admin"])

# Phase 2 — AI scoring reports + history
api_router.include_router(reports.router,  tags=["Reports"])   # GET /attempts/{id}/report
api_router.include_router(history.router,  tags=["History"])   # GET /history
