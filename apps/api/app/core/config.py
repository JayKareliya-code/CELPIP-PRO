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
    # ══════════════════════════════════════════════════════════════════════════
    HOST_IP: str = "localhost"

    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV:       str  = "development"
    APP_NAME:      str  = "CELPIP Platform API"
    API_V1_PREFIX: str  = "/api/v1"
    DEBUG:         bool = False

    # Dev-only authentication bypass: accept "Bearer test_token_<clerk_id>" as
    # a valid login. MUST be False outside local development — the validator
    # below refuses to start if this is True in staging/production. Decoupled
    # from APP_ENV so a misconfigured staging deploy (env=development by
    # accident) still cannot expose the bypass.
    ALLOW_DEV_AUTH_BYPASS: bool = False

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

        if not self.CORS_ORIGINS:
            origins = list(_always_allowed)
            if self.HOST_IP not in ("localhost", "127.0.0.1", ""):
                lan_origin = f"http://{self.HOST_IP}:3000"
                if lan_origin not in origins:
                    origins.append(lan_origin)
            self.CORS_ORIGINS = origins

        if not self.FRONTEND_URL:
            self.FRONTEND_URL = f"http://{self.HOST_IP}:3000"

        _valid_envs = ("development", "staging", "production")
        if self.APP_ENV not in _valid_envs:
            raise ValueError(
                f"APP_ENV must be one of {_valid_envs!r}, got: {self.APP_ENV!r}. "
                "Check your .env file."
            )

        # Dev auth bypass is hard-gated: it MUST NOT be active outside local
        # development. Refusing to boot is safer than logging a warning that
        # nobody sees on a publicly-reachable staging URL.
        if self.ALLOW_DEV_AUTH_BYPASS and self.APP_ENV != "development":
            raise ValueError(
                "ALLOW_DEV_AUTH_BYPASS=True is only permitted when APP_ENV="
                "'development'. The bypass accepts arbitrary 'test_token_*' "
                "tokens as a valid login — leaving it on in staging/production "
                "is a complete authentication bypass."
            )

        # Stripe webhook secret is required in every non-development env, not
        # only production. A staging deploy with the endpoint publicly reachable
        # but no secret accepts unsigned events — an attacker can grant credits
        # at will. Hard-fail at boot instead.
        if self.APP_ENV != "development" and not self.STRIPE_WEBHOOK_SECRET:
            raise ValueError(
                f"STRIPE_WEBHOOK_SECRET is required when APP_ENV={self.APP_ENV!r}. "
                "Configure the value from Stripe Dashboard → Developers → "
                "Webhooks → <endpoint> → Signing secret."
            )

        if self.APP_ENV == "production":
            if self.DEBUG:
                raise ValueError(
                    "DEBUG must be False in production — it enables SQLAlchemy "
                    "echo (logs every query and its parameters) and exposes /docs."
                )
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
            # STRIPE_WEBHOOK_SECRET requirement is enforced earlier (for all
            # non-development envs); no need to re-check here.
            if self.AWS_ACCESS_KEY_ID == "REPLACE_ME" or self.AWS_SECRET_ACCESS_KEY == "REPLACE_ME":
                raise ValueError("AWS credentials are not configured for production.")
            if not self.METRICS_AUTH_TOKEN:
                raise ValueError(
                    "METRICS_AUTH_TOKEN is required in production to protect the "
                    "/metrics endpoint from public access."
                )
            if not self.CLERK_JWT_AUDIENCE:
                raise ValueError(
                    "CLERK_JWT_AUDIENCE is required in production. Set it to this "
                    "API's origin (e.g. 'https://api.celpippro.com') and configure "
                    "the matching `aud` claim in your Clerk JWT template — "
                    "otherwise a token minted by another Clerk app could be "
                    "replayed against this API."
                )

        return self

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL:      str = "postgresql+asyncpg://celpip:celpip@localhost:5432/celpip_dev"
    DATABASE_READ_URL: str = ""

    # ── Redis / Celery ────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Clerk Auth ────────────────────────────────────────────────────────────
    CLERK_SECRET_KEY:      str
    CLERK_PUBLISHABLE_KEY: str
    CLERK_JWKS_URL:        str = "https://api.clerk.dev/v1/jwks"
    # Expected `aud` claim on incoming Clerk JWTs. Empty string disables `aud`
    # verification (acceptable in development only). REQUIRED in production:
    # the prod validator below enforces this. Set this to the API's origin
    # (e.g. "https://api.celpippro.com") and configure the matching `aud`
    # claim in your Clerk JWT template.
    CLERK_JWT_AUDIENCE:    str = ""

    # ── AWS S3 / Cloudflare R2 ────────────────────────────────────────────────
    S3_BUCKET_NAME:          str       = "celpip"
    S3_REGION:               str       = "us-east-1"
    S3_ENDPOINT_URL:         str | None = None
    AWS_ACCESS_KEY_ID:       str       = "REPLACE_ME"
    AWS_SECRET_ACCESS_KEY:   str       = "REPLACE_ME"
    S3_UPLOAD_EXPIRY_SECS:   int       = 900
    S3_DOWNLOAD_EXPIRY_SECS: int       = 3600
    S3_AUDIO_PREFIX:         str       = "audio/"

    # ── Plan quotas ───────────────────────────────────────────────────────────
    STARTER_SPEAKING_PER_TASK:   int = 2
    STARTER_WRITING_PER_TASK:    int = 2
    STARTER_SPEAKING_MOCK_TESTS: int = 1
    STARTER_WRITING_MOCK_TESTS:  int = 1
    PRO_SPEAKING_PER_TASK:       int = 5
    PRO_WRITING_PER_TASK:        int = 5
    PRO_SPEAKING_MOCK_TESTS:     int = 2
    PRO_WRITING_MOCK_TESTS:      int = 2

    # ── Addon credits ─────────────────────────────────────────────────────────
    # Number of practice questions granted per addon pack unit.
    # Applied per-task for module packs (writing_pack / speaking_pack) and
    # per custom_bundle purchase. Multiplied by cart quantity at webhook time.
    ADDON_CREDITS_PER_PACK: int = 5

    # ── Retry credits ─────────────────────────────────────────────────────────
    # Single pool of credits a user spends to REDO an already-completed
    # practice attempt or to retake a mock test. Free plan users get 0 (cannot
    # retry). Pro plan users get PRO_RETRY_CREDITS_GRANT once at activation
    # (never refilled — per spec). Add-on purchases top up this same pool.
    #
    # All values below are independently tunable so the math can be adjusted
    # without changing logic. Defaults follow the convention:
    #   pack credits = (tasks the pack covers) * ADDON_CREDITS_PER_PACK
    #   mock retry cost = number of tasks in that mock
    #   mock bundle credits = sum of both mock retry costs (= 1 of each mock)

    # Tasks per skill (matches the CELPIP test format itself).
    SPEAKING_TASK_COUNT: int = 8
    WRITING_TASK_COUNT:  int = 2

    # One-time grant on Pro plan activation. Never refilled.
    PRO_RETRY_CREDITS_GRANT: int = 70

    # Cost in retry credits per redo action.
    PRACTICE_RETRY_COST:      int = 1   # redo one practice prompt
    SPEAKING_MOCK_RETRY_COST: int = 8   # retake a speaking mock (8 tasks)
    WRITING_MOCK_RETRY_COST:  int = 2   # retake a writing mock (2 tasks)

    # Retry credits granted per add-on purchase unit (multiplied by cart qty).
    WRITING_PACK_RETRY_CREDITS:  int = 10   # = WRITING_TASK_COUNT  * ADDON_CREDITS_PER_PACK
    SPEAKING_PACK_RETRY_CREDITS: int = 40   # = SPEAKING_TASK_COUNT * ADDON_CREDITS_PER_PACK
    CUSTOM_BUNDLE_RETRY_CREDITS: int = 5    # = ADDON_CREDITS_PER_PACK (one task's worth)
    MOCK_BUNDLE_RETRY_CREDITS:   int = 10   # = SPEAKING_MOCK_RETRY_COST + WRITING_MOCK_RETRY_COST

    # ── AI Scoring ────────────────────────────────────────────────────────────
    AI_SCORING_PROVIDER:     str = "openai"
    AI_SCORING_MODEL:        str = "gpt-4o-mini"
    AI_VISION_SCORING_MODEL: str = "gpt-4o"
    AI_STT_PROVIDER:         str = "openai"
    AI_STT_MODEL:            str = "whisper-1"
    AI_FEEDBACK_PROVIDER:    str = "openai"
    AI_FEEDBACK_MODEL:       str = "gpt-4o-mini"
    AI_MAX_RETRIES:          int = 3
    AI_TIMEOUT_SECS:         int = 90

    # Writing scoring uses a single LLM call. The system prompt carries inline
    # Band 6–12 CELPIP calibration anchors plus a weighted-score formula, so
    # accuracy does not require a judge/coach split. Default model is gpt-4o
    # (the model the scoring rubric was calibrated against in score_check.py).
    AI_WRITING_MODEL:        str = "gpt-4o"

    OPENAI_API_KEY:    str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY:    str = ""

    # ── Stripe ────────────────────────────────────────────────────────────────
    STRIPE_PUBLISH_KEY:            str = ""
    STRIPE_SECRET_KEY:             str = ""
    STRIPE_WEBHOOK_SECRET:         str = ""
    STRIPE_PRO_PRICE_ID:           str = ""
    STRIPE_WRITING_PACK_PRICE_ID:  str = ""
    STRIPE_SPEAKING_PACK_PRICE_ID: str = ""
    STRIPE_CUSTOM_BUNDLE_PRICE_ID: str = ""
    STRIPE_MOCK_BUNDLE_PRICE_ID:   str = ""

    # ── Compliance / Terms ────────────────────────────────────────────────────
    TOS_CURRENT_VERSION: str = "2026-05-14"

    # ── Observability ─────────────────────────────────────────────────────────
    SENTRY_DSN:                  str = ""
    OTEL_EXPORTER_OTLP_ENDPOINT: str = ""
    METRICS_AUTH_TOKEN:          str = ""

    # ── Feature Flags ─────────────────────────────────────────────────────────
    UNLEASH_URL:        str = ""
    UNLEASH_TOKEN:      str = ""
    FEATURE_FLAGS_JSON: str = "{}"

    # ── Upload limits ─────────────────────────────────────────────────────────
    AUDIO_MAX_BYTES: int = 25 * 1024 * 1024
    AUDIO_MIN_BYTES: int = 1024
    ESSAY_MAX_CHARS: int = 8000
    ESSAY_MIN_CHARS: int = 1

    # ── Rate limits (per minute, per user) ────────────────────────────────────
    RATE_LIMIT_ATTEMPTS_PER_MIN:    str = "10/minute"
    RATE_LIMIT_SUBMISSIONS_PER_MIN: str = "10/minute"
    RATE_LIMIT_CHECKOUT_PER_MIN:    str = "5/minute"
    RATE_LIMIT_DEFAULT:             str = "120/minute"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
