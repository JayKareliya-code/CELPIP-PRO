"""
Feature Flags API — GET /feature-flags

Returns the current value of all known feature flags for the authenticated
user.  The user's ID and plan are passed as Unleash context so per-user
or per-plan targeting rules can be applied server-side.

Auth: any authenticated user (not admin-only — the client needs flag values).
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.core.feature_flags import evaluate_all
from app.models.user import User

router = APIRouter()

CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/feature-flags")
async def get_feature_flags(user: CurrentUser) -> dict:
    """
    Evaluate all known feature flags for the requesting user.

    Returns:
    ```json
    {
      "flags": {
        "new_essay_prompt": false,
        "mock_exam_v2": true,
        ...
      }
    }
    ```

    Stale-while-revalidate caching is handled by the frontend hook
    (``useFeatureFlags`` — ``staleTime: 60 000 ms``).
    """
    context = {
        "user_id": str(user.id),
        "plan":    user.plan,
    }
    flags = evaluate_all(context)
    return {"flags": flags}
