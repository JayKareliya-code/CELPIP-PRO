from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ══════════════════════════════════════════════════════════════════════════
    # HOST_IP — The ONLY variable you need to change when switching networks.
    #
    #   localhost      → purely local dev (default, your machine only)
    #   10.150.0.143   → LAN hosting (other devices on the same network)
    #
    # This single value automatically drives:
    #   CORS_ORIGINS  → always keeps localhost + adds http://<HOST_IP>:3000
    #   FRONTEND_URL  → Stripe redirect target = http://<HOST_IP>:3000
    #
    # Override CORS_ORIGINS or FRONTEND_URL directly in .env to bypass the
    # auto-compute (e.g. staging/production with a real domain).
    # ══════════════════════════════════════════════════════════════════════════
    HOST_IP: str = "localhost"

    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV:       str  = "development"
    APP_NAME:      str  = "CELPIP Platform API"
    API_V1_PREFIX: str  = "/api/v1"
    DEBUG:         bool = False

    # Leave empty to have HOST_IP drive these automatically.
    # Set explicitly in .env to override the auto-compute entirely.
    CORS_ORIGINS:  list[str] = []
    FRONTEND_URL:  str       = ""

    @model_validator(mode="after")
    def _apply_host_ip(self) -> "Settings":
        """
        Derive CORS_ORIGINS and FRONTEND_URL from HOST_IP when not overridden.

        CORS_ORIGINS
        ─────────────
        - Always contains localhost:3000 and 127.0.0.1:3000 so local dev never breaks.
        - When HOST_IP is neither localhost nor 127.0.0.1, the LAN/host origin
          (http://<HOST_IP>:3000) is appended automatically.
        - If CORS_ORIGINS was already set in .env (non-empty list), it is left
          untouched — explicit always beats auto-compute.

        FRONTEND_URL
        ─────────────
        - Defaults to http://<HOST_IP>:3000.
        - If set in .env (non-empty string), left untouched.

        Production guard
        ─────────────────
        - In production, localhost origins in CORS_ORIGINS raise ValueError so
          accidental dev settings never reach prod.
        """
        _always_allowed: list[str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

        # ── Auto-compute CORS_ORIGINS ─────────────────────────────────────────
        if not self.CORS_ORIGINS:
            origins = list(_always_allowed)
            if self.HOST_IP not in ("localhost", "127.0.0.1", ""):
                lan_origin = f"http://{self.HOST_IP}:3000"
                if lan_origin not in origins:
                    origins.append(lan_origin)
            self.CORS_ORIGINS = origins

        # ── Auto-compute FRONTEND_URL ─────────────────────────────────────────
        if not self.FRONTEND_URL:
            self.FRONTEND_URL = f"http://{self.HOST_IP}:3000"

        # ── Production guard ──────────────────────────────────────────────────
        if self.APP_ENV == "production":
            bad = [o for o in self.CORS_ORIGINS if "localhost" in o]
            if bad:
                raise ValueError(
                    f"CORS_ORIGINS contains localhost in production: {bad}. "
                    "Set HOST_IP to your production domain, or set CORS_ORIGINS explicitly."
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
    S3_ENDPOINT_URL:         str | None = None
    AWS_ACCESS_KEY_ID:       str       = "REPLACE_ME"
    AWS_SECRET_ACCESS_KEY:   str       = "REPLACE_ME"
    S3_UPLOAD_EXPIRY_SECS:   int       = 900
    S3_DOWNLOAD_EXPIRY_SECS: int       = 3600
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

    # ── AI Scoring ────────────────────────────────────────────────────────────
    AI_SCORING_PROVIDER:       str = "openai"
    AI_SCORING_MODEL:          str = "gpt-4o-mini"
    AI_VISION_SCORING_MODEL:   str = "gpt-4o"
    AI_STT_PROVIDER:           str = "openai"
    AI_STT_MODEL:              str = "whisper-1"
    AI_FEEDBACK_PROVIDER:      str = "openai"
    AI_FEEDBACK_MODEL:         str = "gpt-4o-mini"
    AI_MAX_RETRIES:            int = 3
    AI_TIMEOUT_SECS:           int = 90

    OPENAI_API_KEY:    str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY:    str = ""

    # ── Stripe Payments ───────────────────────────────────────────────────────
    STRIPE_PUBLISH_KEY:       str = ""
    STRIPE_SECRET_KEY:        str = ""
    STRIPE_WEBHOOK_SECRET:    str = ""
    STRIPE_PRO_PRICE_ID:      str = ""
    STRIPE_ULTRA_PRICE_ID:    str = ""


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
