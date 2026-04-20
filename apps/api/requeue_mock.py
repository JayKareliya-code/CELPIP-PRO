"""Re-queue all pending mock exam tasks for a given session."""
from sqlalchemy import create_engine, text
from app.workers.mock_exam_tasks import score_mock_exam_task

SESSION_ID = "ba8d2687-d3b4-437d-a0df-90f47a74e25e"

engine = create_engine("postgresql+psycopg2://celpip:celpip@db:5432/celpip_dev")
with engine.connect() as conn:
    rows = conn.execute(
        text("SELECT id FROM mock_exam_task_attempts WHERE session_id=:s AND status='pending'"),
        {"s": SESSION_ID},
    ).fetchall()

for row in rows:
    score_mock_exam_task.delay(str(row[0]))
    print(f"Queued: {row[0]}")

print(f"Done — queued {len(rows)} tasks")
