# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# CELPIP PRO API — multi-stage Dockerfile
#
# Stage 1 (builder): installs compiler toolchain + Python wheels.
# Stage 2 (runtime): copies just the wheels into a minimal slim image.
#
# Resulting runtime image carries libpq5 (not libpq-dev), no gcc, no apt
# caches — smaller surface area and faster cold-start than a single-stage
# build. The base image is pinned by digest so a silent Debian point-release
# can't change behaviour mid-deploy; bump intentionally with
# `docker pull python:3.11-slim && docker image inspect ... --format '{{.RepoDigests}}'`.
# ─────────────────────────────────────────────────────────────────────────────

ARG PYTHON_BASE=python:3.11-slim@sha256:9a7765b36773a37061455b332f18e265e7f58f6fea9c419a550d2a8b0e9db834


# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM ${PYTHON_BASE} AS builder

# Compile-time deps for any wheels we can't get prebuilt (psycopg2-binary
# itself is prebuilt; this set covers source-only wheels like asyncpg's
# fallback path).
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Install into a private prefix so we can copy the whole tree across stages.
ENV PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt requirements.lock ./
RUN pip install --prefix=/install --no-cache-dir -r requirements.lock


# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM ${PYTHON_BASE} AS runtime

# Runtime-only system deps: libpq5 (for psycopg2 / asyncpg) and ffmpeg for
# audio transcoding. Notably no build-essential, no libpq-dev.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        ffmpeg \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the installed Python tree from the builder. /install collapses into
# the standard prefix so installed binaries (alembic, celery, uvicorn) are
# on PATH automatically.
COPY --from=builder /install /usr/local

# Application source.
COPY . .

# Non-root user. Created AFTER source copy so the appuser doesn't accidentally
# own files it shouldn't be writing to.
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Liveness probe baked into the image so orchestrators that don't read
# docker-compose's HEALTHCHECK (raw `docker run`, ECS, plain Kubernetes
# liveness defaults) still get a useful signal. Hits /api/v1/health/live
# (a cheap always-200 check) — not /health, which also probes Redis + Postgres
# and would restart the container on a transient dependency blip.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl --fail --silent --show-error http://127.0.0.1:8000/api/v1/health/live || exit 1

# --timeout-graceful-shutdown caps how long uvicorn waits for in-flight
# connections (notably long-lived SSE streams) before forcing shutdown.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-graceful-shutdown", "10"]

EXPOSE 8000
