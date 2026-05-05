"""Pydantic request schemas for the admin prompts API."""
from pydantic import BaseModel, Field

from app.schemas.prompt import ChoiceOption


class SpeakingPromptIn(BaseModel):
    task_number: int = Field(ge=0, le=8)
    title: str
    prompt_text: str
    slug: str | None = None
    topic: str | None = None
    instructions_text: str | None = None
    context_image_url: str | None = None
    prep_time_seconds: int = 30
    response_time_seconds: int = 60
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    has_parts: bool = False
    part_count: int = 1
    vocabulary_tips: list[str] = []
    connector_phrases: list[str] = []
    template_hint: str | None = None
    sort_order: int = 0
    is_active: bool = True
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")
    sample_response_band12: str | None = None
    choice_options: list[ChoiceOption] | None = None
    curveball_option: ChoiceOption | None = None
    curveball_instruction_text: str | None = None
    default_choice_index: int | None = None
    # Determines which pool this prompt belongs to:
    #   "practice" → served in individual task practice attempts
    #   "mock"     → served in full mock exam sessions only
    prompt_tag: str = Field(default="practice", pattern="^(practice|mock)$")
    # Assigns a mock prompt to a specific exam slot (1, 2, …). Only
    # meaningful when prompt_tag = 'mock'. None = unassigned.
    exam_slot: int | None = Field(default=None, ge=1)


class SpeakingPromptPatchIn(BaseModel):
    """PATCH-only schema — all fields optional, no lifecycle defaults.

    Unlike SpeakingPromptIn (used for POST/create), this schema has NO
    defaults for lifecycle fields (status, prep_time_seconds, etc.), so an
    omitted field is truly absent from model_dump(exclude_unset=True) and
    the DB column is left untouched.  This prevents accidental regression
    of published → draft or image-url → null when the frontend omits a
    field that has no corresponding form input.
    """
    task_number: int | None = Field(None, ge=0, le=8)
    title: str | None = None
    prompt_text: str | None = None
    slug: str | None = None
    topic: str | None = None
    instructions_text: str | None = None
    context_image_url: str | None = None
    prep_time_seconds: int | None = None
    response_time_seconds: int | None = None
    difficulty: str | None = Field(None, pattern="^(easy|medium|hard)$")
    has_parts: bool | None = None
    part_count: int | None = None
    vocabulary_tips: list[str] | None = None
    connector_phrases: list[str] | None = None
    template_hint: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    status: str | None = Field(None, pattern="^(draft|published|archived)$")
    sample_response_band12: str | None = None
    choice_options: list[ChoiceOption] | None = None
    curveball_option: ChoiceOption | None = None
    curveball_instruction_text: str | None = None
    default_choice_index: int | None = None
    prompt_tag: str | None = Field(None, pattern="^(practice|mock)$")
    # See SpeakingPromptIn.exam_slot
    exam_slot: int | None = Field(default=None, ge=1)


class SpeakingImageUploadIn(BaseModel):
    """Request body for the speaking prompt image presign endpoint."""
    task_number: int = Field(description="Must be 3, 4, or 8")
    filename: str = Field(min_length=1, description="Original filename e.g. 'scene-001.jpg'")
    mime_type: str = Field(description="MIME type e.g. 'image/jpeg'")


class Task5OptionImageUploadIn(BaseModel):
    """Request body for Task 5 option card image presign endpoint."""
    slot: str = Field(description="'option-a', 'option-b', or 'curveball'")
    filename: str = Field(min_length=1)
    mime_type: str


class WritingPromptIn(BaseModel):
    task_number: int = Field(ge=1, le=2)
    title: str
    prompt_text: str
    task_type: str
    slug: str | None = None
    topic: str | None = None
    instructions_text: str | None = None
    min_words: int
    max_words: int | None = None
    time_limit_seconds: int
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    idea_hints: list[str] = []
    intro_template: str | None = None
    conclusion_template: str | None = None
    sort_order: int = 0
    is_active: bool = True
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")
    sample_response_band12: str | None = None
    # Determines which pool this prompt belongs to:
    #   "practice" → served in individual task practice (default)
    #   "mock"     → served in full mock writing exam sessions only
    prompt_tag: str = Field(default="practice", pattern="^(practice|mock)$")
    # Assigns a mock prompt to a specific exam slot (1, 2, …). Only
    # meaningful when prompt_tag = 'mock'. None = unassigned.
    exam_slot: int | None = Field(default=None, ge=1)


class WritingPromptPatchIn(BaseModel):
    """PATCH-only schema — all fields optional, no lifecycle defaults.

    Unlike WritingPromptIn (used for POST/create), an omitted field here is
    truly absent from model_dump(exclude_unset=True), so the DB column is left
    untouched.  This prevents accidental regression of status or difficulty
    values when the frontend only changes one field.
    """
    task_number: int | None = Field(None, ge=1, le=2)
    title: str | None = None
    prompt_text: str | None = None
    task_type: str | None = None
    slug: str | None = None
    topic: str | None = None
    instructions_text: str | None = None
    min_words: int | None = None
    max_words: int | None = None
    time_limit_seconds: int | None = None
    difficulty: str | None = Field(None, pattern="^(easy|medium|hard)$")
    idea_hints: list[str] | None = None
    intro_template: str | None = None
    conclusion_template: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    status: str | None = Field(None, pattern="^(draft|published|archived)$")
    sample_response_band12: str | None = None
    prompt_tag: str | None = Field(None, pattern="^(practice|mock)$")
    # See WritingPromptIn.exam_slot
    exam_slot: int | None = Field(default=None, ge=1)

