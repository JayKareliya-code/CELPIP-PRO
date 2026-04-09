"""
Speaking rubric system prompt builder.

The system prompt is assembled once per scoring call by injecting:
  1. CELPIP band descriptors  (from band_descriptors.py)
  2. Calibration examples fetched from the DB  (from calibration.py)
  3. Task-type context — image tasks (3, 4, 8) get an extra instruction
     telling the model to treat the scene image as primary reference material.

The final string is passed directly to the LLM as the system message.
"""
from __future__ import annotations

from app.services.ai.rubric.band_descriptors import SPEAKING_BAND_DESCRIPTORS

# ── Image-aware task numbers ──────────────────────────────────────────────────

#: Tasks that present a scene image to the candidate.
#: Tasks 3 & 4 share the same image per prompt set; Task 8 uses a unique image.
IMAGE_TASKS: frozenset[int] = frozenset({3, 4, 8})

# ── Base template (text-only tasks 1, 2, 6, 7) ───────────────────────────────

_BASE_SPEAKING_SYSTEM_PROMPT = """
You are a certified CELPIP examiner with 10 years of experience scoring speaking responses.

## Your Task
Score the candidate's speaking response on FIVE dimensions, each scored 1–12 using the
official CELPIP band scale. Return ONLY valid JSON conforming to the provided schema.
Do NOT add commentary, preamble, or any text outside the JSON object.

## CELPIP Speaking Dimensions
1. **Task Completion** — Does the response fully address all parts of the prompt?
   Weight: 25% of estimated_band.
2. **Coherence & Cohesion** — Is the response logically organized with appropriate
   discourse markers and topic sentences?  Weight: 20%.
3. **Vocabulary Range** — Does the candidate use varied, precise, context-appropriate
   vocabulary?  Weight: 20%.
4. **Fluency & Pronunciation** — Is delivery smooth with minimal unnatural pauses?
   Weight: 20%.
5. **Grammatical Accuracy** — Are grammatical structures accurate, varied and complex?
   Weight: 15%.

## Band Scale Reference
{band_descriptors}

## Calibration Examples
{calibration_block}

## Scoring Rules
- Score EACH dimension independently before computing estimated_band.
- **estimated_band formula:** round to nearest 0.5:
  (task_completion×0.25 + coherence×0.20 + vocabulary×0.20 + fluency×0.20 + grammar×0.15)
- **strengths / weaknesses:** max 3 items each; must be concrete and specific about
  THIS response (never generic phrases like "good grammar" or "poor vocabulary").
- **improvement_tips:** actionable, CELPIP-focused, max 4 items.
- **sample_response:** A model answer to the SAME prompt, written at the candidate's target
  band level (see ## Candidate Goal below). Length: **130 to 180 words exactly** — no shorter,
  no longer.
""".strip()

# ── Target-band addendum ─────────────────────────────────────────────────────

_TARGET_BAND_ADDENDUM = """

## Candidate Goal
This candidate is targeting Band {target_band} on the CELPIP speaking test.
When writing sample_response:
- Calibrate the vocabulary complexity, grammatical range, and fluency markers to
  what a genuine Band {target_band} speaker would produce — not a Band 12 ideal.
- The response must be between 130 and 180 words. Count carefully.
- Do NOT mention the band number in the sample response itself.
""".strip()

_DEFAULT_BAND_ADDENDUM = """

## Candidate Goal
No target band has been set. Write sample_response at a Band 9–10 quality level.
The response must be between 130 and 180 words. Count carefully.
""".strip()

_IMAGE_TASK_ADDENDUM = """

## Image Context (Task {task_number})
The candidate was shown a scene image during this task (provided as a vision attachment).
You MUST use the image content as the primary reference when scoring **Task Completion**:
- A high-scoring response will accurately describe, predict, or reference specific
  elements visible in the image (people, objects, setting, actions, mood).
- Penalise responses that describe something unrelated to or inconsistent with the image.
- If the image shows a specific scenario (e.g., a party, a park bench, a workplace),
  the sample_response you generate must also be grounded in THAT scene.
""".strip()

_TASK5_ADDENDUM = """

## Task 5 — Comparing & Persuading Context
The candidate completed a three-phase task:
  1. Selection (60s): Chose one of two options and prepared their argument.
  2. Curveball Preparation (60s): A surprise third option was revealed; candidate prepared a rebuttal.
  3. Speaking (60s): The candidate spoke. The transcript covers ONLY this final 60-second phase.

Score Task Completion on:
1. Whether the candidate clearly defended their chosen option with specific, concrete details
   (e.g. cost, duration, schedule, salary after graduation).
2. Whether they explicitly addressed the curveball option and compared it unfavourably to
   their choice using direct evidence — not vague or generic statements.
3. Penalise responses that ignore the curveball entirely or only repeat the same points
   without making a direct comparative argument.
""".strip()


def build_speaking_system_prompt(
    calibration_block: str,
    task_number: int | None = None,
    target_band: float | None = None,
) -> str:
    """
    Assemble the full speaking system prompt with band descriptors and
    calibration examples stitched in.

    For image-based tasks (3, 4, 8) an extra instruction block is appended
    that tells the model how to use the scene image when scoring Task Completion.

    For Task 5 (Comparing & Persuading), a curveball-specific addendum is
    appended that explains the three-phase structure and scoring criteria.

    When target_band is set (6–12) the prompt instructs the model to write the
    sample_response at that band quality and within 130–180 words.

    Args:
        calibration_block: Pre-formatted string from calibration.py.
                           Pass "" if no samples are available.
        task_number:       The speaking task number (0–8).  Used to determine
                           whether to append the image-context or task5 addendum.
        target_band:       User's target band (6–12), or None if not set.

    Returns:
        Complete system prompt string ready to send to the LLM.
    """
    band_text = "\n".join(
        f"Band {band}: {desc}"
        for band, desc in sorted(SPEAKING_BAND_DESCRIPTORS.items(), reverse=True)
    )
    base = _BASE_SPEAKING_SYSTEM_PROMPT.format(
        band_descriptors=band_text,
        calibration_block=calibration_block or "No calibration examples available for this task.",
    )

    # Append target-band / default word-count addendum
    if target_band is not None:
        base = base + "\n\n" + _TARGET_BAND_ADDENDUM.format(target_band=target_band)
    else:
        base = base + "\n\n" + _DEFAULT_BAND_ADDENDUM

    # Append image-task addendum after the target block
    if task_number is not None and task_number in IMAGE_TASKS:
        base = base + "\n\n" + _IMAGE_TASK_ADDENDUM.format(task_number=task_number)

    # Append Task 5 curveball addendum
    if task_number == 5:
        base = base + "\n\n" + _TASK5_ADDENDUM

    return base

