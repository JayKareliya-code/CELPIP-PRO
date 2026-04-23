"""Writing routes — tasks listing and attempt lifecycle."""
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.models.attempt import Attempt
from app.models.score_report import ScoreReport
from app.models.user import User
from app.schemas.prompt import WritingTaskResponse
from app.schemas.attempt import (
    StartWritingAttemptRequest,
    StartAttemptResponse,
    SubmitWritingRequest,
)
from app.services import prompt_service, attempt_service

# ── Schemas ───────────────────────────────────────────────────────────────────

class WritingMockTaskResult(BaseModel):
    attempt_id:     str
    task_number:    int
    status:         str           # pending | processing | complete | failed
    estimated_band: float | None = None

class WritingMockResultsResponse(BaseModel):
    results:    list[WritingMockTaskResult]
    all_scored: bool              # True when every task is complete or failed

router = APIRouter()


@router.get("/mock-prompts", response_model=list[WritingTaskResponse])
async def list_writing_mock_prompts(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> list[WritingTaskResponse]:
    """Return published+active writing prompts tagged 'mock' for the mock exam.

    Returns one prompt per task number (Task 1 + Task 2), sorted by task_number
    then sort_order — mirrors GET /mock-exam/prompts for speaking.
    """
    prompts = await prompt_service.get_writing_mock_tasks(db)
    # De-duplicate: one per task_number (lowest sort_order = first in list)
    seen: set[int] = set()
    result = []
    for p in sorted(prompts, key=lambda x: (x.task_number, x.sort_order)):
        if p.task_number not in seen:
            seen.add(p.task_number)
            result.append(p)
    return [WritingTaskResponse.model_validate(p) for p in result]


@router.get("/tasks", response_model=list[WritingTaskResponse])
async def list_writing_tasks(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> list[WritingTaskResponse]:
    """Return all active writing prompts ordered by task number."""
    prompts = await prompt_service.get_writing_tasks(db)
    return [WritingTaskResponse.model_validate(p) for p in prompts]


@router.get("/tasks/by-id/{prompt_id}", response_model=WritingTaskResponse)
async def get_writing_task_by_id(
    prompt_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> WritingTaskResponse:
    """Return a single published+active writing prompt by UUID.

    Used by /writing/[task]/[promptId]/practice — mirrors speaking's
    GET /tasks/by-id/{prompt_id} endpoint.
    """
    prompt = await prompt_service.get_writing_prompt_by_id(db, prompt_id)
    return WritingTaskResponse.model_validate(prompt)


@router.get("/tasks/{task_number}/attempted-prompts", response_model=list[str])
async def get_attempted_writing_prompt_ids(
    task_number: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[str]:
    """Return writing prompt UUIDs the user has already attempted for a task.

    Used by the /writing/[task] page to mark prompts as attempted so the
    UI can show a 'Redo' CTA instead of 'Start Writing'.
    """
    from app.repositories.attempt_repo import AttemptRepository
    ids = await AttemptRepository(db).get_attempted_prompt_ids(
        user.id, task_number, skill="writing"
    )
    return list(ids)


@router.get("/tasks/{task_number}", response_model=WritingTaskResponse)
async def get_writing_task(
    task_number: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> WritingTaskResponse:
    """Return a single active writing prompt by task number."""
    prompt = await prompt_service.get_writing_task(db, task_number)
    return WritingTaskResponse.model_validate(prompt)


@router.post("/attempts/start", response_model=StartAttemptResponse, status_code=201)
@limiter.limit(settings.RATE_LIMIT_ATTEMPTS_PER_MIN)
async def start_writing_attempt(
    request: Request,
    response: Response,
    body: StartWritingAttemptRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StartAttemptResponse:
    """Quota check + attempt creation run inside ONE DB transaction.

    We commit immediately (before returning 201) so the attempt row is
    guaranteed durable by the time the client sends POST /attempts/{id}/submit.
    Without this, the new DB session for submit can open a snapshot before
    the start transaction's autocommit lands, causing a transient 404.
    """
    result = await attempt_service.start_writing(
        db=db,
        user=user,
        prompt_id=body.prompt_id,
        is_mock_test=body.is_mock_test,
        mock_exam_number=body.mock_exam_number,
    )
    await db.commit()  # eager commit — do not wait for get_db end-of-request
    return result


@router.post("/attempts/{attempt_id}/submit", response_model=StartAttemptResponse)
@limiter.limit(settings.RATE_LIMIT_SUBMISSIONS_PER_MIN)
async def submit_writing(
    request: Request,
    response: Response,
    attempt_id: uuid.UUID,
    body: SubmitWritingRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StartAttemptResponse:
    """Save essay, apply server-side word count, enqueue Celery scoring task.

    Server-side word count is authoritative — not the client's count.
    """
    return await attempt_service.submit_writing(
        db=db,
        user=user,
        attempt_id=attempt_id,
        essay_text=body.essay_text,
        auto_submitted=body.auto_submitted,
    )


@router.get("/mock-results", response_model=WritingMockResultsResponse)
async def get_writing_mock_results(
    attempt_ids: str = Query(..., description="Comma-separated attempt UUIDs"),
    user: Annotated[User, Depends(get_current_user)] = ...,
    db:   Annotated[AsyncSession, Depends(get_db)]   = ...,
) -> WritingMockResultsResponse:
    """Poll endpoint — returns status + band scores for a set of writing mock attempts.

    Frontend calls with ?attempt_ids=<id1>,<id2> and polls every 5 s until
    all_scored is True.  Mirrors GET /mock-exam/attempts/{session_id}/results
    for speaking mock exams.
    """
    ids = [uuid.UUID(a.strip()) for a in attempt_ids.split(",") if a.strip()]

    # Fetch Attempt rows (ownership check: user_id must match)
    rows = (
        await db.execute(
            select(Attempt)
            .where(Attempt.id.in_(ids))
            .where(Attempt.user_id == user.id)
        )
    ).scalars().all()

    # Fetch band scores from ScoreReport (may not exist yet if still pending)
    score_map: dict[uuid.UUID, float | None] = {}
    if rows:
        score_rows = (
            await db.execute(
                select(ScoreReport).where(ScoreReport.attempt_id.in_([r.id for r in rows]))
            )
        ).scalars().all()
        score_map = {sr.attempt_id: float(sr.estimated_band) for sr in score_rows if sr.estimated_band}

    terminal = {"complete", "failed"}
    results = [
        WritingMockTaskResult(
            attempt_id=str(r.id),
            task_number=r.task_number,
            status=r.status,
            estimated_band=score_map.get(r.id),
        )
        for r in rows
    ]

    all_scored = bool(results) and all(res.status in terminal for res in results)

    return WritingMockResultsResponse(results=results, all_scored=all_scored)
