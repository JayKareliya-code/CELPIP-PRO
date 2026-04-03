# CELPIP PRO — Setup Guide (Windows)

## Prerequisites

### 1. PostgreSQL (required for migrations)

**Option A: Install PostgreSQL 15+**

- Download: https://www.postgresql.org/download/windows/
- During installation, set password for `postgres` user
- Keep default port: 5432

**Option B: Use Docker** (faster)

```bash
docker run --name celpip-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

### 2. Verify PostgreSQL is running

```bash
# Test connection (install pg if needed: choco install postgresql)
psql -U postgres -h localhost -c "SELECT version();"
```

---

## Database Setup

### Mac/Linux

```bash
# Connect as postgres superuser
psql -U postgres

# In psql:
CREATE USER celpip WITH PASSWORD 'celpip';
CREATE DATABASE celpip_dev OWNER celpip;
GRANT ALL PRIVILEGES ON DATABASE celpip_dev TO celpip;
\q
```

### Windows (PowerShell or Command Prompt)

```bash
# If using Docker:
docker exec -it celpip-postgres psql -U postgres

# If installed locally, use pgAdmin or:
psql -U postgres -h localhost

# In psql:
CREATE USER celpip WITH PASSWORD 'celpip';
CREATE DATABASE celpip_dev OWNER celpip;
GRANT ALL PRIVILEGES ON DATABASE celpip_dev TO celpip;
\q
```

---

## Environment Setup

### 1. Create `.env` file

```bash
cd apps/api
cp .env.example .env
```

### 2. Fill in `.env`

Edit `apps/api/.env` and update:

```env
# Database (should auto-work if you created user above)
DATABASE_URL=postgresql+asyncpg://celpip:celpip@localhost:5432/celpip_dev

# Get from Clerk dashboard: https://dashboard.clerk.com/apps
CLERK_SECRET_KEY=sk_test_your_actual_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here

# For S3 (optional, use dummy values for local dev)
AWS_ACCESS_KEY_ID=local_dev_key
AWS_SECRET_ACCESS_KEY=local_dev_secret
```

### 3. Get Clerk Keys

1. Go to https://dashboard.clerk.com
2. Create app (if not done)
3. Click "API Keys" in left sidebar
4. Copy the `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY`
5. Paste into .env

---

## Run Migrations

### From `apps/api/` directory:

```bash
# Install Python dependencies (if not done)
pip install -r requirements.txt

# Run migrations
rtk alembic upgrade head

# Or without RTK:
python -m alembic upgrade head
```

### If migration fails with password error:

```bash
# Test connection directly
psql postgresql://celpip:celpip@localhost:5432/celpip_dev -c "SELECT 1;"

# If that fails, check:
# 1. PostgreSQL is running
# 2. User "celpip" exists and has password "celpip"
# 3. Database "celpip_dev" was created
# 4. No firewall blocking port 5432
```

---

## Troubleshooting

### Error: "password authentication failed for user 'celpip'"

- Verify credentials: `psql -U celpip -d celpip_dev -h localhost`
- If connection works in psql but fails in alembic, check DATABASE_URL format in .env

### Error: "database 'celpip_dev' does not exist"

```bash
psql -U postgres -h localhost
# then: CREATE DATABASE celpip_dev OWNER celpip;
```

### Error: "connection refused" on port 5432

- PostgreSQL not running (start it with `brew services start postgresql` or Docker)

### Error: "CLERK_SECRET_KEY not provided"

- Copy from Clerk dashboard and paste into .env

---

## Next Steps

1. ✅ Create PostgreSQL user & database
2. ✅ Copy & fill .env
3. ✅ Run migrations: `rtk alembic upgrade head`
4. ✅ Start API: `python apps/api/main.py` or `rtk uvicorn ...`
5. ✅ Test admin endpoints in FastAPI docs: http://localhost:8000/docs
