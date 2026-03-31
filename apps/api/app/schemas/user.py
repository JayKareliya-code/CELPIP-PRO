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

class SetTargetScoreRequest(BaseModel):
    target_band: float = Field(ge=1, le=12)
