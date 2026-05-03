"""
CELPIP Band Descriptors (1–12) for speaking and writing.

These descriptors are injected into every scoring system prompt.  They anchor
the LLM to the official CELPIP scale so scores stay calibrated.

Source: Official CELPIP Level Descriptors and CELPIP_LLM_Scoring_Context.md §2, §4, §5, §10.

Maintenance note:
  - Descriptors match the official CELPIP language exactly.
  - If CELPIP updates its official rubric, update this file immediately.
  - Band 0: not persisted as a score — pipeline converts band < 4 to an
    "unable to assess" result rather than storing a raw 0–3 band.
"""

# ── Speaking Band Descriptors ─────────────────────────────────────────────────
# Aligned with §4 Speaking Rubric and §10 Band Decision Rules.

SPEAKING_BAND_DESCRIPTORS: dict[int, str] = {
    12: (
        "Expert proficiency. Handles demanding, non-routine situations with precision, "
        "flexibility, and strong control. Ideas are fully developed with clear, specific "
        "details. Language range is very broad with idiomatic or figurative language used "
        "naturally. Delivery is consistently fluent and intelligible with excellent "
        "intonation. Grammar is highly accurate with complex structural variety. Tone and "
        "style adapt precisely to any situation, purpose, and listener."
    ),
    11: (
        "Advanced proficiency. Handles demanding situations very well with clear, precise "
        "language and strong control, with only minor limitations. Task is almost fully "
        "addressed with elaboration. Vocabulary is broad with very minor imprecision. "
        "Delivery is fluent with rare self-corrections. Very few minor grammar errors that "
        "do not affect meaning."
    ),
    10: (
        "Highly effective proficiency. Handles moderately demanding or some high-stakes "
        "situations effectively. Ideas are clear, detailed, and mostly natural. Task is "
        "fully addressed. Broad vocabulary range. Generally fluent with minor pauses or "
        "self-corrections. Very few grammar errors that do not impede comprehension. "
        "Adapts tone well to the situation."
    ),
    9: (
        "Effective proficiency. Communicates effectively with good support and organization. "
        "Task is largely complete with some discourse markers. Good vocabulary with "
        "occasional repetition. Mostly fluent with some natural pauses. Some grammar errors "
        "but meaning remains clear. Conveys intended meaning and adjusts style to a range "
        "of situations."
    ),
    8: (
        "Good proficiency. Communicates clearly in more demanding everyday situations. "
        "Task is mostly complete. Ideas are developed but may lack depth or full flexibility. "
        "Common vocabulary plus some context-specific words. Some pauses but overall "
        "intelligible. Grammar mostly accurate with some noticeable errors. Tone generally "
        "appropriate."
    ),
    7: (
        "Adequate proficiency. Communicates adequately in somewhat demanding situations. "
        "Main ideas are understandable but development, vocabulary, or grammar may be "
        "limited. Task mostly complete but with gaps. Common words with some more precise "
        "vocabulary. Noticeable pauses and some hesitation. Several grammar errors that do "
        "not consistently block meaning. Conveys meaning in familiar or somewhat demanding "
        "situations."
    ),
    6: (
        "Developing proficiency. Communicates basic information and opinions in everyday "
        "situations, but support, accuracy, and organization are limited. Some ideas "
        "communicated. Partial task completion. Mostly common words. Frequent pauses and "
        "hesitation affecting fluency. Several grammar errors affecting clarity at times. "
        "Conveys accurate basic information but may not fully adapt style."
    ),
    5: (
        "Acquiring proficiency. Can communicate familiar information with simple language. "
        "Limited complexity and frequent gaps. Task mostly incomplete. Very limited "
        "vocabulary. Frequent pauses interrupting flow. Many grammar errors frequently "
        "hindering comprehension."
    ),
    4: (
        "Adequate for daily life activities. Can produce simple descriptions or personal "
        "information but communication is limited. Task largely incomplete. Very limited "
        "vocabulary with many inaccuracies. Very frequent pauses. Many grammar errors "
        "severely hindering comprehension."
    ),
    3: (
        "Some proficiency in limited personal contexts. Can communicate very basic needs "
        "or familiar information with major limitations. Very little of the task addressed. "
        "No clear structure. Vocabulary barely adequate to convey the simplest ideas. "
        "Nearly constant pauses and reformulations. Grammar errors make most content "
        "incomprehensible."
    ),
    2: (
        "Limited ability. Minimal communication. Task effectively not completed. No "
        "organization. Very few recognizable words or phrases. Almost all speech "
        "incomprehensible due to errors and pausing."
    ),
    1: (
        "Very limited ability or insufficient information. No meaningful communication "
        "attempted. Response is silent, off-topic, completely incomprehensible, or "
        "impossible to assess."
    ),
}

# ── Writing Band Descriptors ──────────────────────────────────────────────────
# Aligned with §5 Writing Rubric and §10 Band Decision Rules.

WRITING_BAND_DESCRIPTORS: dict[int, str] = {
    12: (
        "Expert proficiency. All task requirements fully and thoroughly met with precise, "
        "complete development. Excellent paragraph structure with clear introduction, "
        "development, and conclusion. Wide, specialized, formal, or precise vocabulary "
        "used effectively. Tone and style are perfectly appropriate to the situation and "
        "audience. Virtually no grammar, spelling, or punctuation errors. Transitions "
        "connect ideas smoothly throughout."
    ),
    11: (
        "Advanced proficiency. Task requirements fully met. Clear and well-structured "
        "response. Wide vocabulary with very minor imprecision. Appropriate tone and "
        "style throughout. Minor errors that do not affect comprehension."
    ),
    10: (
        "Highly effective proficiency. Task requirements fully met with good development "
        "of all points. Clear paragraph structure with topic sentences. Varied vocabulary "
        "using synonyms and collocations. Tone consistently appropriate. Rare grammar or "
        "spelling errors that do not affect readability. Smooth transitions within and "
        "between paragraphs."
    ),
    9: (
        "Effective proficiency. Task requirements mostly met. All main points addressed "
        "though some may be underdeveloped. Structure present with basic connectors "
        "(however, furthermore). Accurate vocabulary with some repetition. Tone generally "
        "appropriate. A few noticeable grammar errors that occasionally slow the reader "
        "but do not block meaning."
    ),
    8: (
        "Good proficiency. Task requirements mostly met but at least one point is missing "
        "or significantly underdeveloped. Basic paragraph structure but weak topic "
        "sentences. Vocabulary is functional but repetitive. Tone occasionally slips. "
        "Several grammar errors that sometimes affect clarity. Follows common writing "
        "conventions; main ideas are conveyed."
    ),
    7: (
        "Adequate proficiency. Task requirements partially met — at least one required "
        "point is absent or addressed in only one sentence. Paragraphing exists but ideas "
        "within paragraphs are disjointed. Vocabulary limited to common everyday words "
        "with noticeable repetition. Tone sometimes inappropriate. Several grammar errors "
        "including subject-verb agreement, tense, or article mistakes. Conveys factual "
        "information with mostly appropriate conventions."
    ),
    6: (
        "Developing proficiency. Task requirements partially met. Limited organization "
        "with ideas jumping between topics. Vocabulary limited with frequent repetition "
        "and imprecise word choices. Tone issues throughout. Several grammar errors "
        "affecting clarity in multiple sentences. Conveys some factual information with "
        "sometimes appropriate tone."
    ),
    5: (
        "Acquiring proficiency. Many task requirements missed. Poor structure. Very "
        "limited vocabulary. Inappropriate tone in places. Frequent errors. Communicates "
        "only familiar or simple information."
    ),
    4: (
        "Adequate for daily life activities. Most task requirements not met. Very poor "
        "structure. Very limited vocabulary. Inappropriate tone. Frequent errors severely "
        "affecting meaning."
    ),
    3: (
        "Some proficiency in limited personal contexts. Task requirements largely not met. "
        "Little discernible structure. Vocabulary barely adequate to convey simple ideas. "
        "Tone inappropriate. Errors make much content incomprehensible."
    ),
    2: (
        "Limited ability. Very little of the task addressed. No usable structure. Very "
        "few recognizable words. Meaning almost wholly unclear due to errors."
    ),
    1: (
        "Very limited ability or insufficient information. Task requirements not attempted "
        "or completely off-topic. No structure. Incomprehensible."
    ),
}
