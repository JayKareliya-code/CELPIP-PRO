"""
Directly run mock_exam_pipeline for all pending rows in a session.
Run this from inside the worker container:
  docker compose exec worker python /app/rescore_mock.py
"""
import asyncio
import sqlalchemy as sa
from sqlalchemy import create_engine, text

from app.services.ai.pipeline.mock_exam_pipeline import run_mock_exam_pipeline

SESSION_ID = "ba8d2687-d3b4-437d-a0df-90f47a74e25e"
DB_URL     = "postgresql+psycopg2://celpip:celpip@db:5432/celpip_dev"

engine = create_engine(DB_URL)
with engine.connect() as conn:
    rows = conn.execute(
        text("SELECT id FROM mock_exam_task_attempts WHERE session_id = :s"),
        {"s": SESSION_ID},
    ).fetchall()

print(f"Found {len(rows)} attempts — running pipeline for each...")

for row in rows:
    attempt_id = str(row[0])
    print(f"  Scoring {attempt_id} ...", end=" ", flush=True)
    try:
        asyncio.run(run_mock_exam_pipeline(attempt_id))
        print("done")
    except Exception as exc:
        print(f"FAILED: {exc}")

print("All done.")
