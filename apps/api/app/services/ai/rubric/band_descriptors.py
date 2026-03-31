"""
CELPIP Band Descriptors (1–12) for speaking and writing.

These descriptors are injected into every scoring system prompt.  They anchor
the LLM to the official CELPIP scale so scores stay calibrated.

Maintenance note:
  - Odd bands (3, 5, 7, 9, 11) are interpolated — CELPIP's published descriptors
    use even bands.  During Day 9 calibration, adjust these as needed.
  - If CELPIP updates its official rubric, update this file immediately.
"""

# ── Speaking Band Descriptors ─────────────────────────────────────────────────

SPEAKING_BAND_DESCRIPTORS: dict[int, str] = {
    12: (
        "Communicates all ideas with exceptional clarity; exemplary task completion "
        "with full elaboration; highly coherent and cohesive organization; wide, "
        "precise vocabulary used naturally; fluent delivery with no unnatural pauses; "
        "near-native grammatical accuracy and structural variety."
    ),
    11: (
        "Communicates ideas very clearly; almost complete task fulfillment; "
        "well-organized with smooth discourse markers; broad vocabulary with only very "
        "minor imprecision; fluent with rare self-corrections; very few minor grammar errors."
    ),
    10: (
        "Communicates ideas clearly; strong task completion; well-organized response; "
        "broad vocabulary range; generally fluent with minor self-corrections or short "
        "pauses; very few grammar errors that do not impede comprehension."
    ),
    9: (
        "Mostly clear communication; task largely complete; adequate organization with "
        "some discourse markers; good vocabulary with occasional repetition; mostly fluent "
        "with some natural pauses; some grammar errors but meaning remains clear."
    ),
    8: (
        "Communicates main ideas; task mostly complete; generally organized with basic "
        "connectors; adequate vocabulary though repetition is noticeable; some pauses but "
        "overall intelligible; grammar mostly accurate with some errors."
    ),
    7: (
        "Ideas mostly communicated despite some gaps; partial task completion; basic "
        "organization; vocabulary limited to common words with some inaccuracies; "
        "noticeable pauses and some hesitation; several grammar errors."
    ),
    6: (
        "Some ideas communicated; partial task completion; noticeable organization issues; "
        "limited vocabulary with repetition; frequent pauses and hesitation affecting "
        "fluency; several grammar errors affecting clarity at times."
    ),
    5: (
        "Limited communication; task mostly incomplete; little organization; very limited "
        "vocabulary; frequent pauses interrupting flow; many grammar errors frequently "
        "hindering comprehension."
    ),
    4: (
        "Communication severely limited; task largely incomplete; poor or no organization; "
        "very limited vocabulary with many inaccuracies; very frequent pauses; many grammar "
        "errors severely hindering comprehension."
    ),
    3: (
        "Minimal communication; very little of the task addressed; no clear structure; "
        "vocabulary barely adequate to convey the simplest ideas; nearly constant pauses "
        "and reformulations; grammar errors make most content incomprehensible."
    ),
    2: (
        "Minimal communication; task effectively not completed; no organization; very few "
        "recognizable words or phrases; almost all speech incomprehensible due to errors "
        "and pausing."
    ),
    1: (
        "No meaningful communication attempted; response is silent, off-topic, or "
        "completely incomprehensible."
    ),
}

# ── Writing Band Descriptors ──────────────────────────────────────────────────

WRITING_BAND_DESCRIPTORS: dict[int, str] = {
    12: (
        "All task requirements fully and thoroughly met; excellent paragraph structure "
        "with a clear introduction, development and conclusion; precise academic or "
        "professional vocabulary used appropriately; tone perfectly matches task type "
        "(email/survey/essay); virtually no grammar or spelling errors."
    ),
    11: (
        "Task requirements fully met; clear and well-structured response; wide vocabulary; "
        "appropriate tone throughout; minor errors that do not affect comprehension."
    ),
    10: (
        "Task requirements met; clear structure; varied vocabulary; generally appropriate "
        "tone; minor grammar or spelling errors that do not impede reading."
    ),
    9: (
        "Task requirements mostly met; adequate structure; some vocabulary variety; "
        "mostly appropriate tone; a few grammar or spelling errors."
    ),
    8: (
        "Task requirements mostly met; adequate structure; adequate vocabulary; "
        "generally appropriate tone; some grammar errors affecting clarity occasionally."
    ),
    7: (
        "Task requirements partially met; some structure present; limited vocabulary "
        "range; tone sometimes inappropriate; several grammar errors."
    ),
    6: (
        "Task requirements partially met; limited organization; limited vocabulary with "
        "repetition; tone issues; several grammar errors affecting clarity."
    ),
    5: (
        "Many task requirements missed; poor structure; very limited vocabulary; "
        "inappropriate tone in places; frequent errors."
    ),
    4: (
        "Most task requirements not met; very poor structure; very limited vocabulary; "
        "inappropriate tone; frequent errors severely affect meaning."
    ),
    3: (
        "Task requirements largely not met; little discernible structure; vocabulary "
        "barely adequate to convey simple ideas; tone inappropriate; errors make much "
        "content incomprehensible."
    ),
    2: (
        "Very little of the task addressed; no usable structure; very few recognizable "
        "words; meaning almost wholly unclear due to errors."
    ),
    1: (
        "Task requirements not attempted or completely off-topic; no structure; "
        "incomprehensible."
    ),
}
