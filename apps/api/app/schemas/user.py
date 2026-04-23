from pydantic import BaseModel, ConfigDict, Field

class UserMeResponse(BaseModel):
    """Maps 1:1 to frontend AppUser interface."""
    model_config = ConfigDict(from_attributes=True)

    id:               str
    clerk_id:         str
    full_name:        str
    email:            str
    plan:             str       # starter | pro | ultra
    role:             str       # user | admin
    streak_days:      int
    last_active_date: str | None
    target_band:      float | None
    tos_accepted_at:  str | None = None
    tos_version:      str | None = None

class SetTargetScoreRequest(BaseModel):
    target_band: float = Field(ge=1, le=12)


class WeakAreaItem(BaseModel):
    """One aggregated dimension row returned by GET /users/me/weak-areas."""
    dimension:     str    # snake_case key, e.g. "fluency"
    label:         str    # human-readable, e.g. "Fluency & Pronunciation"
    avg_score:     float  # 1.0–12.0
    attempt_count: int    # how many scored attempts contributed
