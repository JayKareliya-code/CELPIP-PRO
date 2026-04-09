from uuid import UUID
from pydantic import BaseModel, ConfigDict

# ── Task 5 sub-models ─────────────────────────────────────────────────────────

class ChoiceOptionDetail(BaseModel):
    """A single label/value row inside a Task 5 option card."""
    label: str
    value: str

class ChoiceOption(BaseModel):
    """One option card — used for the two initial choices and the curveball."""
    name:      str
    image_url: str | None = None
    details:   list[ChoiceOptionDetail]

# ── Response schemas ──────────────────────────────────────────────────────────

class SpeakingTaskResponse(BaseModel):
    """Maps 1:1 to frontend SpeakingTask interface."""
    model_config = ConfigDict(from_attributes=True)

    id:                    UUID
    task_number:           int
    title:                 str
    prep_time_seconds:     int
    response_time_seconds: int
    prompt_text:           str
    difficulty:            str
    vocabulary_tips:       list[str]
    connector_phrases:     list[str]
    template_hint:         str | None
    has_parts:             bool
    part_count:            int
    # Image-based tasks (3 — Describing a Scene, 4 — Making Predictions,
    # 8 — Describing an Unusual Situation).
    context_image_url:     str | None = None
    # ── Task 5 — Comparing & Persuading ───────────────────────────────────────
    choice_options:             list[ChoiceOption] | None = None
    curveball_option:           ChoiceOption       | None = None
    curveball_instruction_text: str                | None = None
    default_choice_index:       int                | None = None



class WritingTaskResponse(BaseModel):
    """Maps 1:1 to frontend WritingTask interface."""
    model_config = ConfigDict(from_attributes=True)

    id:                  UUID
    task_number:         int
    title:               str
    task_type:           str
    time_limit_seconds:  int
    min_words:           int
    max_words:           int | None
    prompt_text:         str
    idea_hints:          list[str]
    intro_template:      str | None
    conclusion_template: str | None
