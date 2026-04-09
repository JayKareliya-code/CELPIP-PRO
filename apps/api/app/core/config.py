from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV:       str  = "development"
    APP_NAME:      str  = "CELPIP Platform API"
    API_V1_PREFIX: str  = "/api/v1"
    DEBUG:         bool = False
    CORS_ORIGINS:  list[str] = ["http://localhost:3000"]

    @model_validator(mode="after")
    def _validate_prod_settings(self) -> "Settings":
        if self.APP_ENV == "production":
            localhost_origins = [o for o in self.CORS_ORIGINS if "localhost" in o]
            if localhost_origins:
                raise ValueError(
                    f"CORS_ORIGINS contains localhost in production: {localhost_origins}. "
                    "Set CORS_ORIGINS to your deployed frontend URL."
                )
        return self

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://celpip:celpip@localhost:5432/celpip_dev"

    # ── Redis / Celery ────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Clerk Auth ────────────────────────────────────────────────────────────
    CLERK_SECRET_KEY:      str
    CLERK_PUBLISHABLE_KEY: str
    CLERK_JWKS_URL:        str = "https://api.clerk.dev/v1/jwks"

    # ── AWS S3 / Cloudflare R2 ────────────────────────────────────────────────
    S3_BUCKET_NAME:          str       = "celpip"
    S3_REGION:               str       = "us-east-1"
    S3_ENDPOINT_URL:         str | None = None           # set for Cloudflare R2
    AWS_ACCESS_KEY_ID:       str       = "REPLACE_ME"   # placeholder — set before running speaking tasks
    AWS_SECRET_ACCESS_KEY:   str       = "REPLACE_ME"   # placeholder — set before running speaking tasks
    S3_UPLOAD_EXPIRY_SECS:   int       = 900            # 15 min
    S3_DOWNLOAD_EXPIRY_SECS: int       = 3600           # 1 hr
    S3_AUDIO_PREFIX:         str       = "audio/"

    # ── Quotas ────────────────────────────────────────────────────────────────
    STARTER_SPEAKING_MOCK_TESTS: int = 1
    STARTER_WRITING_MOCK_TESTS:  int = 1
    PRO_SPEAKING_PER_TASK:       int = 5
    PRO_WRITING_PER_TASK:        int = 5
    PRO_SPEAKING_MOCK_TESTS:     int = 2
    PRO_WRITING_MOCK_TESTS:      int = 2
    ULTRA_SPEAKING_PER_TASK:     int = 15
    ULTRA_WRITING_PER_TASK:      int = 15
    ULTRA_SPEAKING_MOCK_TESTS:   int = 5
    ULTRA_WRITING_MOCK_TESTS:    int = 5

    # ── AI Scoring (Phase 2) ──────────────────────────────────────────────────
    # Provider selection — hot-swappable via config, no code changes required.
    # Valid values: "openai" | "anthropic" | "gemini"
    AI_SCORING_PROVIDER:       str = "openai"
    AI_SCORING_MODEL:          str = "gpt-4o-mini"  # LLM for text-only tasks
    AI_VISION_SCORING_MODEL:   str = "gpt-4o"       # Vision-capable LLM for image tasks (3,4,8)
    AI_STT_PROVIDER:           str = "openai"
    AI_STT_MODEL:              str = "whisper-1"    # STT model for speaking
    AI_FEEDBACK_PROVIDER:      str = "openai"
    AI_FEEDBACK_MODEL:         str = "gpt-4o-mini"
    AI_MAX_RETRIES:            int = 3
    AI_TIMEOUT_SECS:           int = 90

    # AI Provider API Keys — only set the key for the active provider.
    # OPENAI_API_KEY is required when AI_SCORING_PROVIDER=openai (default).
    OPENAI_API_KEY:    str = ""           # placeholder — fill in before running AI pipeline
    ANTHROPIC_API_KEY: str = ""           # only needed if AI_SCORING_PROVIDER=anthropic
    GEMINI_API_KEY:    str = ""           # only needed if AI_SCORING_PROVIDER=gemini


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
