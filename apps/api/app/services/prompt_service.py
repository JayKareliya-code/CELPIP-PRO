"""Prompt service — thin orchestration layer over prompt repositories."""
import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prompt import SpeakingPrompt, WritingPrompt
from app.repositories.prompt_repo import SpeakingPromptRepository, WritingPromptRepository


async def get_speaking_tasks(db: AsyncSession) -> list[SpeakingPrompt]:
    """Return all active speaking prompts."""
    return await SpeakingPromptRepository(db).list_active()


async def get_speaking_task(db: AsyncSession, task_number: int) -> SpeakingPrompt:
    """Return an active speaking prompt for a given task number or raise 404."""
    prompt = await SpeakingPromptRepository(db).get_active_by_task(task_number)
    if not prompt:
        raise HTTPException(
            status_code=404,
            detail=f"No active speaking prompt found for task {task_number}",
        )
    return prompt


async def get_writing_tasks(db: AsyncSession) -> list[WritingPrompt]:
    """Return all active writing prompts."""
    return await WritingPromptRepository(db).list_active()


async def get_writing_task(db: AsyncSession, task_number: int) -> WritingPrompt:
    """Return an active writing prompt for a given task number or raise 404."""
    prompt = await WritingPromptRepository(db).get_active_by_task(task_number)
    if not prompt:
        raise HTTPException(
            status_code=404,
            detail=f"No active writing prompt found for task {task_number}",
        )
    return prompt


async def get_speaking_prompt_by_id(
    db: AsyncSession, prompt_id: uuid.UUID
) -> SpeakingPrompt:
    """Return a speaking prompt by UUID or raise 404."""
    prompt = await SpeakingPromptRepository(db).get_by_id(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Speaking prompt not found")
    return prompt


async def get_writing_prompt_by_id(
    db: AsyncSession, prompt_id: uuid.UUID
) -> WritingPrompt:
    """Return a writing prompt by UUID or raise 404."""
    prompt = await WritingPromptRepository(db).get_by_id(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Writing prompt not found")
    return prompt
