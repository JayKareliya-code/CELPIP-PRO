from fastapi import APIRouter
from app.api.v1 import health, users, speaking, writing, attempts, admin, mock_exam, billing
from app.api.v1 import reports, history          # Phase 2
from app.api.v1 import (
    admin_prompts,
    admin_materials,
    admin_assets,
    admin_tags,
    admin_audit,
    admin_cost_report,
    feature_flags,
)

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

# Phase CMS — admin content management
api_router.include_router(admin_prompts.router,   prefix="/admin", tags=["Admin CMS — Prompts"])
api_router.include_router(admin_materials.router, prefix="/admin", tags=["Admin CMS — Materials"])
api_router.include_router(admin_assets.router,    prefix="/admin", tags=["Admin CMS — Assets"])
api_router.include_router(admin_tags.router,      prefix="/admin", tags=["Admin CMS — Tags"])
api_router.include_router(admin_audit.router,     prefix="/admin", tags=["Admin CMS — Audit"])

# Mock exam
api_router.include_router(mock_exam.router, tags=["Mock Exam"])

# Billing — Stripe one-time payments
api_router.include_router(billing.router, prefix="", tags=["Billing"])

# Feature flags (authenticated, any user)
api_router.include_router(feature_flags.router, tags=["Feature Flags"])

# Admin — AI cost report
api_router.include_router(admin_cost_report.router, prefix="/admin", tags=["Admin CMS — Cost Report"])
