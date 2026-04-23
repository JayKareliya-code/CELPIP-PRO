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

        # ── APP_ENV guard ─────────────────────────────────────────────────────
        _valid_envs = ("development", "staging", "production")
        if self.APP_ENV not in _valid_envs:
            raise ValueError(
                f"APP_ENV must be one of {_valid_envs!r}, got: {self.APP_ENV!r}. "
                "Check your .env file."
            )

        # ── Production guard ──────────────────────────────────────────────────
        if self.APP_ENV == "production":
            bad = [o for o in self.CORS_ORIGINS if "localhost" in o]
            if bad:
                raise ValueError(
                    f"CORS_ORIGINS contains localhost in production: {bad}. "
                    "Set HOST_IP to your production domain, or set CORS_ORIGINS explicitly."
                )
            http_origins = [o for o in self.CORS_ORIGINS if o.startswith("http://")]
            if http_origins:
                raise ValueError(
                    f"CORS_ORIGINS contains http:// origins in production: {http_origins}. "
                    "Use https:// only."
                )
            if not self.STRIPE_WEBHOOK_SECRET:
                raise ValueError(
                    "STRIPE_WEBHOOK_SECRET is required in production."
                )
            if self.AWS_ACCESS_KEY_ID == "REPLACE_ME" or self.AWS_SECRET_ACCESS_KEY == "REPLACE_ME":
                raise ValueError(
                    "AWS credentials are not configured for production."
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

    # ── Compliance / Terms ────────────────────────────────────────────────────
    TOS_CURRENT_VERSION: str = "2026-04-22"

    # ── Observability ─────────────────────────────────────────────────────────
    # Leave SENTRY_DSN empty to disable Sentry (default in dev).
    # In production, set to your project DSN: https://xxx@oyyy.ingest.sentry.io/zzz
    SENTRY_DSN: str = ""

    # OpenTelemetry tracing (S2-1)
    # Set to OTLP gRPC endpoint to enable distributed tracing.
    # In docker-compose dev: OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
    # Leave empty to disable (default).
    OTEL_EXPORTER_OTLP_ENDPOINT: str = ""
    # Optional bearer token to guard GET /metrics in non-dev deployments.
    # When empty, /metrics is unprotected (fine inside a private VPC/subnet).
    METRICS_AUTH_TOKEN: str = ""

    # ── Feature Flags ─────────────────────────────────────────────
    # Option A: self-hosted Unleash (optional dep: UnleashClient>=5.2.0)
    #   Set both UNLEASH_URL and UNLEASH_TOKEN to activate.
    # Option B: env-var JSON (no extra dep, works out of the box)
    #   Set FEATURE_FLAGS_JSON to a JSON object, e.g.:
    #     FEATURE_FLAGS_JSON='{"new_essay_prompt": true, "mock_exam_v2": false}'
    # Unknown flags always default to False (safe / closed).
    UNLEASH_URL:        str = ""    # e.g. https://unleash.internal/api
    UNLEASH_TOKEN:      str = ""    # Unleash client API token
    FEATURE_FLAGS_JSON: str = "{}"  # JSON dict[str, bool] for env-var fallback

    # ── Upload limits ─────────────────────────────────────────────────────────
    AUDIO_MAX_BYTES:       int  = 25 * 1024 * 1024   # 25 MB
    AUDIO_MIN_BYTES:       int  = 1024               # 1 KB
    ESSAY_MAX_CHARS:       int  = 8000
    ESSAY_MIN_CHARS:       int  = 1

    # ── Rate limits (per minute, per user) ────────────────────────────────────
    RATE_LIMIT_ATTEMPTS_PER_MIN:   str = "10/minute"
    RATE_LIMIT_SUBMISSIONS_PER_MIN: str = "10/minute"
    RATE_LIMIT_CHECKOUT_PER_MIN:    str = "5/minute"
    RATE_LIMIT_DEFAULT:             str = "120/minute"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
