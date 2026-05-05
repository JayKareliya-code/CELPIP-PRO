"""Prompt service — thin orchestration layer over prompt repositories."""
import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prompt import SpeakingPrompt, WritingPrompt
from app.repositories.prompt_repo import SpeakingPromptRepository, WritingPromptRepository


async def get_speaking_tasks(db: AsyncSession) -> list[SpeakingPrompt]:
    """Return all active 'practice' speaking prompts."""
    return await SpeakingPromptRepository(db).list_active()


async def get_mock_exam_prompts(db: AsyncSession, slot: int) -> list[SpeakingPrompt]:
    """Return published+active 'mock' speaking prompts for a specific exam slot.

    slot (int): the exam slot number (1, 2, …) — only prompts assigned to
    this slot are returned. Used exclusively by GET /mock-exam/prompts.
    """
    return await SpeakingPromptRepository(db).list_active_mock(slot)


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
    """Return all active PRACTICE writing prompts (prompt_tag='practice')."""
    return await WritingPromptRepository(db).list_active()


async def get_writing_mock_tasks(db: AsyncSession, slot: int) -> list[WritingPrompt]:
    """Return published+active MOCK writing prompts for a specific exam slot.

    slot (int): the exam slot number (1, 2, …). Only prompts assigned to
    this slot are returned. Used by GET /writing/mock-prompts.
    """
    return await WritingPromptRepository(db).list_mock_active(slot)



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
    """Return a published+active speaking prompt by UUID or raise 404.

    Uses get_active_by_id() so archived/draft prompts cannot be accessed
    even if the candidate has a direct bookmarked URL.
    """
    prompt = await SpeakingPromptRepository(db).get_active_by_id(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Speaking prompt not found")
    return prompt


async def get_writing_prompt_by_id(
    db: AsyncSession, prompt_id: uuid.UUID
) -> WritingPrompt:
    """Return a published+active writing prompt by UUID or raise 404.

    Uses get_active_by_id() so archived/draft prompts cannot be accessed
    even if the candidate has a direct bookmarked URL — mirrors
    get_speaking_prompt_by_id().
    """
    prompt = await WritingPromptRepository(db).get_active_by_id(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Writing prompt not found")
    return prompt
