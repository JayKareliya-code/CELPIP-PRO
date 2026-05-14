# syntax=docker/dockerfile:1
FROM python:3.11-slim AS base

# ── System deps ──────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ── Python deps ───────────────────────────────────────────────────────────────
WORKDIR /app

# Install from the fully-pinned lockfile for reproducible builds.
# requirements.txt is the human-edited manifest; requirements.lock is generated
# from it (see the header in requirements.lock for the regenerate command).
COPY requirements.txt requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock

# ── Application source ────────────────────────────────────────────────────────
COPY . .

# ── Non-root user for security ────────────────────────────────────────────────
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# ── Default command (overridden in docker-compose) ────────────────────────────
# --timeout-graceful-shutdown caps how long uvicorn waits for in-flight
# connections (notably long-lived SSE streams) before forcing shutdown.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-graceful-shutdown", "10"]

EXPOSE 8000
