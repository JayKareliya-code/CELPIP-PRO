"""
Re-run the writing pipeline directly for specific failed attempts.
Run from inside the worker container:
  docker compose exec worker python /app/rescore_writing.py

Uses subprocess-per-attempt to give each pipeline its own fresh event loop,
avoiding the asyncpg "Future attached to a different loop" error that occurs
when multiple asyncio.run() calls share a cached engine in the same process.
"""
import subprocess
import sys

ATTEMPT_IDS = [
    "7c0007d3-adb5-4d9e-8953-74ba2d4825a0",
    "ddf3a6aa-88dd-41bd-a791-bf840eef8321",
]

for attempt_id in ATTEMPT_IDS:
    print(f"Scoring {attempt_id} ...", end=" ", flush=True)
    result = subprocess.run(
        [sys.executable, "-c",
         f"import asyncio; from app.services.ai.pipeline.writing_pipeline import run_writing_pipeline; asyncio.run(run_writing_pipeline('{attempt_id}'))"],
        capture_output=True, text=True,
    )
    if result.returncode == 0:
        print("done ✓")
    else:
        print(f"FAILED:\n{result.stderr[-1000:]}")

print("All done.")
