from uuid import UUID
from pydantic import BaseModel, ConfigDict

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
