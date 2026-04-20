"""
Writing rubric system prompt builder.

Mirrors speaking_rubric.py:
  - Band descriptors injected (writing-specific)
  - Calibration block injected
  - Target-band addendum (same sample_response word-count contract as speaking)
  - Task-type addendum (Task 1 = email, Task 2 = opinion essay)
"""
from __future__ import annotations

from app.services.ai.rubric.band_descriptors import WRITING_BAND_DESCRIPTORS

# ── Writing task types ────────────────────────────────────────────────────────

WRITING_TASK_TYPES: dict[int, str] = {
    1: "email",
    2: "opinion_essay",
}

# ── Base template ─────────────────────────────────────────────────────────────

_BASE_WRITING_SYSTEM_PROMPT = """
You are a certified CELPIP examiner with 10 years of experience scoring writing responses.

## Your Task
Score the candidate's written response on FIVE dimensions, each scored 1–12 using the
official CELPIP band scale. Return ONLY valid JSON conforming to the provided schema.
Do NOT add commentary, preamble, or any text outside the JSON object.

## CELPIP Writing Dimensions
1. **Task Fulfillment** — Does the response fully address all parts of the prompt
   with appropriate content and sufficient development?  Weight: 30%.
2. **Organization** — Is the response logically structured with clear paragraphing,
   topic sentences, and appropriate discourse markers?  Weight: 25%.
3. **Tone & Register** — Does the language suit the task type (formal email, survey
   response, opinion essay)?  Is the tone consistent?  Weight: 15%.
4. **Vocabulary Range** — Does the writer use varied, precise, context-appropriate
   vocabulary with minimal repetition?  Weight: 15%.
5. **Grammatical Accuracy** — Are grammatical structures accurate, varied, and
   appropriately complex?  Spelling correct?  Weight: 15%.

## Band Scale Reference
{band_descriptors}

## Calibration Examples
{calibration_block}

## Scoring Rules
- Score EACH dimension independently before computing estimated_band.
- **estimated_band formula:** round to nearest 0.5:
  (task_fulfillment×0.30 + organization×0.25 + tone_register×0.15 + vocabulary×0.15 + grammar×0.15)
- **strengths / weaknesses:** max 3 items each; concrete about THIS response.
- **improvement_tips:** actionable, CELPIP-focused, max 4 items.
- **sample_response:** A model answer to the SAME prompt written at the candidate's
  target band level (see ## Candidate Goal below). Length: **150 to 200 words exactly**.
""".strip()

# ── Target-band addenda ───────────────────────────────────────────────────────

_TARGET_BAND_ADDENDUM = """

## Candidate Goal
This candidate is targeting Band {target_band} on the CELPIP writing test.
When writing sample_response:
- Calibrate vocabulary complexity, grammatical range, and organization quality to
  what a genuine Band {target_band} writer would produce — not a Band 12 ideal.
- The response must be between 150 and 200 words. Count carefully.
- Do NOT mention the band number in the sample response itself.
""".strip()

_DEFAULT_BAND_ADDENDUM = """

## Candidate Goal
No target band has been set. Write sample_response at a Band 9–10 quality level.
The response must be between 150 and 200 words. Count carefully.
""".strip()

# ── Task-type addenda ─────────────────────────────────────────────────────────

_EMAIL_TASK_ADDENDUM = """

## Task 1 — Email Writing Context
The candidate was asked to write a formal or semi-formal email.
When scoring **Tone & Register**:
- Penalise casual language (slang, contractions in formal contexts) and overly stiff phrasing.
- The email must have a clear subject context, appropriate salutation and closing.
- A high-scoring email directly fulfils all listed bullet-point requirements in the prompt.
When writing sample_response, produce an email response (include salutation and closing).
""".strip()

_ESSAY_TASK_ADDENDUM = """

## Task 2 — Opinion Essay Context
The candidate was asked to write a structured opinion essay.
When scoring **Organization**:
- Expect an introduction with a clear thesis, body paragraphs with topic sentences,
  and a conclusion that restates the position.
- Penalise responses that lack a thesis or jump between ideas without connecting phrases.
When scoring **Tone & Register**:
- Academic or semi-formal tone is expected; avoid inappropriate informality.
When writing sample_response, produce an essay with clear intro, body, and conclusion.
""".strip()


# ── Builder ───────────────────────────────────────────────────────────────────

def build_writing_system_prompt(
    calibration_block: str,
    task_number: int | None = None,
    target_band: float | None = None,
) -> str:
    """
    Assemble the full writing system prompt.

    Args:
        calibration_block: Pre-formatted string from calibration.py.
        task_number:       The writing task number (1 or 2). Used to append
                           the appropriate task-type addendum.
        target_band:       User's target band (6–12), or None if not set.

    Returns:
        Complete system prompt string ready to send to the LLM.
    """
    band_text = "\n".join(
        f"Band {band}: {desc}"
        for band, desc in sorted(WRITING_BAND_DESCRIPTORS.items(), reverse=True)
    )
    base = _BASE_WRITING_SYSTEM_PROMPT.format(
        band_descriptors=band_text,
        calibration_block=calibration_block or "No calibration examples available for this task.",
    )

    # Append target-band / default word-count addendum
    if target_band is not None:
        base = base + "\n\n" + _TARGET_BAND_ADDENDUM.format(target_band=target_band)
    else:
        base = base + "\n\n" + _DEFAULT_BAND_ADDENDUM

    # Append task-type addendum
    if task_number == 1:
        base = base + "\n\n" + _EMAIL_TASK_ADDENDUM
    elif task_number == 2:
        base = base + "\n\n" + _ESSAY_TASK_ADDENDUM

    return base
