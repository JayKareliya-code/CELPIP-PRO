"""
Scoring diagnostic — self-contained, no project imports required.

PURPOSE
-------
Measures how accurately the model scores CELPIP Writing essays by:
  1. Using the full official 4-dimension CELPIP rubric (inline — no imports needed).
  2. Injecting 3 inline calibration examples (Band 6 / Band 8 / Band 10) so the
     model has concrete contrast anchors, not just a Band 12 ceiling.
  3. Auto-loading the local .env file so you can run this without setting
     OPENAI_API_KEY manually in the shell.
  4. Tracking ground-truth band scores and printing delta / MAE / direction bias.

HOW TO RUN
----------
  # single essay (quick check)
  py score_check.py

  # batch mode — scores all ESSAY_BANK entries and prints a calibration table
  py score_check.py --batch

HOW MANY CALIBRATION EXAMPLES TO USE
-------------------------------------
  3-5 examples covering LOW / MID / HIGH bands is the sweet spot.
  - Fewer than 3  → model has no contrast; drifts upward.
  - More than 6   → diminishing returns; competes with the essay for attention.
  The 3 examples below (Band 6 / 8 / 10) give the model a full L-scale to
  interpolate from.  Add a Band 7 example if you find the model over-scoring
  mid-range essays.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import statistics

import httpx


# ── Auto-load .env (no python-dotenv required) ────────────────────────────────

def _load_env(path: str = ".env") -> None:
    """Parse a simple KEY=VALUE .env file and inject into os.environ."""
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip("\"'")
                if key and key not in os.environ:   # do not override shell env
                    os.environ[key] = value
    except FileNotFoundError:
        pass   # running inside Docker / CI where env vars are already set


_load_env()   # runs immediately on import


# ── Model ─────────────────────────────────────────────────────────────────────

MODEL = "gpt-4o"   # change to match the production model

# Paste your OpenAI API key here to run without touching .env or the shell.
# Leave as "" to fall back to OPENAI_API_KEY from the environment / .env file.
API_KEY = ""


# ── Inputs (single-essay mode) ────────────────────────────────────────────────

PROMPT_TEXT = """\
You recently stayed at a hotel during a business trip, but your experience \
was disappointing because the room was noisy and the service was poor. \
Write an email to the hotel manager. In your email:
1) describe the problems you experienced
2) explain how they affected your stay
3) say what you would like the manager to do\
"""

CANDIDATE_ESSAY = """\
Dear Manager,

I stayed in your hotel for two nights last Tuesday and Wednesday. I chose it because it is close to my office meeting, but my stay was not good.

First, the room was much too noisy. There were people talking in the corridor until late night, and cars sounded like they were right beside my bed. I tried to close the window tighter, but the noise stayed. I only slept a few hours.

Second, I phoned the front desk two times for help. The first worker just said “sorry, we are full.” The second worker told me to wait, but nobody called back. I felt the service did not care.

Because of these problems I was very tired in my morning meeting and could not do my job well. I hope you can give me some money back, maybe half of the price, and also train staff to answer guests faster.

Sincerely,
Daniel Brooks
\
"""

# Set to the actual official CELPIP band for the essay above.
KNOWN_BAND: int | None = 12


# ── Multi-essay batch bank ────────────────────────────────────────────────────
# Each entry: {prompt, essay, known_band, label}
# Add real CELPIP essays with known official bands here for meaningful MAE tracking.

ESSAY_BANK: list[dict] = [
    {
        "label": "Hotel complaint – off-topic response (Band 4 expected)",
        "known_band": 4,
        "prompt": PROMPT_TEXT,
        "essay": CANDIDATE_ESSAY,
    },
    # Add more essays below:
    # {
    #     "label": "Hotel complaint – Band 7 sample",
    #     "known_band": 7,
    #     "prompt": PROMPT_TEXT,
    #     "essay": "...",
    # },
]


# ── Official CELPIP calibration examples (Task A — Email Writing) ─────────────
# Source: sample_reponses.txt — real CELPIP scored samples, bands 6-12.
# These are the authoritative anchors the model uses to interpolate band scores.
# Score the candidate response against the BAND SCALE, not by direct comparison.

_CALIBRATION_BLOCK = """
### Official CELPIP Scored Email Examples — Use as Band Anchors

These are REAL CELPIP-scored email responses at each band level.
They are for a library-hours prompt (not this prompt) — they show writing
QUALITY at each band, not topic knowledge. Score against the BAND SCALE.

---

**BAND 12** — Expert proficiency. Precise vocabulary, specific personal detail,
community-level argument, polished tone, seamless structure.

Dear Ms. Sonora,
My name is Charles Stevens. As a longstanding resident of the neighbourhood, I have
had an Annex Library Card for two decades. I truly appreciate the work that you do
as the Chief Librarian, in making it such an inclusive environment and fostering the
local community.
Now, as a parent of two children (Gary, 6, and Sofia, 4) it is clear to me that the
library's service to the community could be enhanced if opening hours were extended
to Sundays and Mondays. As you know, many families have sports activities and shopping
scheduled on Saturday mornings. Sunday is the only day on which we could all enjoy
the library's play rooms, youth groups, and creative programs. Monday is the only
night on which all members of the Annex Theatrical Troupe can practice in the auditorium.
These opinions are widely shared: parents at Annex Kindergarten are unanimous in their
desire to share a Sunday cappuccino in the downstairs coffee shop, and to rehearse
their lines in the auditorium on Mondays.
Please consider opening the library seven days a week; I hope to raise the issue at
your next steering committee meeting.
Warm regards, Charles Stevens

---

**BAND 11** — Advanced proficiency. Personal context well developed, clear reasons,
good vocabulary, minor grammar issues, appropriate tone.

Dear Sir/Madam,
I am an avid user of my local public library. I visit the library several times a
week, and would like to use it more, but I find the opening hours somewhat restrictive.
I am a single mother currently studying for a Masters at the Open University. As I am
undertaking my studies from home, I don't have access to a university library.
Unfortunately I have very poor internet connection where I live and so rely heavily on
the public library to conduct online research.
In addition, my daughter is a book fanatic - she simply loves to read. Our favourite
thing to do together is to spend time in the library at weekends. However, her swimming
lessons have now been scheduled for Saturdays. She does not have time to visit the
library on the same day. As the library is closed on Sundays, we have to live without
our weekly library visit together.
I feel the library should be open to the public every day of the week. It is an
important resource for people looking for work, studying, or for those who simply wish
to expand their minds.
B. Smith

---

**BAND 10** — Highly effective. All bullets covered, organized paragraphs, varied
word choice, mostly fluent, minor apostrophe errors.

Dear Chief Librarian,
I use the local public library several times a week to research material, and access
word processing for my studies. Access to the library is integral to my schooling,
and as such, flexible opening hours are vital.
I recently started a part-time job which requires me to cover shifts on the weekend,
and varying week days. Unfortunately, this restricts my ability to access the library
given the current opening hours. I feel that if the hours were extended to be open
7 days a week, it would enhance the experience of many patrons.
For many people, the library is a place of leisure and recreation; as such, if it
were to open on both Saturdays and Sundays, kids and adults alike could enjoy the
enriching activities offered at your facility over the entire weekend.
Thank you for reviewing this request, and I hope you will consider extending opening
hours to 7 days a week.
Kind regards, Vanessa

---

**BAND 9** — Effective. All bullets addressed, adequate vocabulary, clear reasons,
some wordiness, appropriate register.

To whom it may concern,
My name is Seth and I am writing to you today regarding the opening hours for the
library. I am an English student and my course requires me to read many books
throughout the year. As a result, I visit the library several times a week to rent
the required books. Books can be very expensive, so the library is a great benefit
to me as instead of spending lots of money buying these expensive books I can rent
them instead at a much lower cost.
I have recently started a new part-time job. Now, my only days off are Sundays and
Tuesdays. The library is closed on Sundays which leaves Tuesday evenings after school
as the only time I can visit the library. As the library closes early on Tuesdays,
I have to rush down after school. This is very stressful for me and it would be much
easier if the library was open on Sundays.
I feel that many other people have the same problem and would benefit greatly if the
library was open every day. I hope you will consider this.
Thanks, Seth

---

**BAND 8** — Good. All bullets present, community suggestion included, but grammar
errors ('would not be meet'), some repetition, adequate vocabulary.

Dear Chief Librarian,
I am writing to you with regards to the operating hours of your library. I would
appreciate that the library committee will consider operating on Sundays and Mondays
as well.
I am a regular patron of your library. I need to visit the library for my research
and self study sessions required for my part time MBA course. Occasionally, I would
be required to work late for meetings and overtime, and would not be meet the library
operating hours. I could only use the library on Saturday, which is a day I would
need to complete other household chores.
By opening your library daily, it can benefit not just me, but the entire community.
Most families will spend their Sundays doing things together. The library can certainly
organize story telling sessions or talks/workshops that are family friendly on Sundays.
I hope my suggestions can be considered by the committee.
Regards, Wendy

---

**BAND 7** — Adequate. Main point clear but development is thin; repeated word
('request request'); limited vocabulary; informal salutation ('Respected Sir'); no
closing line.

Respected Sir,
Library is the best source of information and knowledge, easily accessible to public.
I visit library 4 to 5 times a week spending a minimum of 2 hours on each visit. I
would like to put forth my request request to keep the library open every day of a
week, in public interest.
People work in different environments with different schedule. For instance, my work
shifts enables me to take Sunday/Monday offs whereas, my wife gets Saturday/Sunday
offs. These are the days which are most comfortable and convenient us to visit and
more time in library reading. But unfortunately, the public library is not open on
Sundays and Mondays which keeps most of the public away from library.
As said, library being the source of information for most of the public should be
accessible to public every day to ensure we cover interests of interested people.
Thanks, XYZ

---

**BAND 6** — Developing. No salutation or closing, memo-style format wrong for
email, only basic vocabulary, incomplete last sentence, ideas not developed.

Date: 13 June 2016
To: Chief Librarian
Topic: Importance of Library
I believe that library is very important in our society. Library is where we find all
the information that want to see. It is important to everyone specially for the student
to give an extra ideas and searching and learning from their assignments. Even for
ordinary people is very useful and helpful. Sometime people will came to library to
read books during their spare times and they feel good after they read their favourite
books.
The library is closed every Sunday and Monday and it will not work for me. I am a
full time employee and work in weekdays. And Sundays is just my spare time to visit
library.
I hope that you will find a solution for the schedule of the opening Hours of the
library special during [incomplete]
""".strip()


# ── Full CELPIP rubric system prompt ──────────────────────────────────────────

SYSTEM_PROMPT = f"""\
You are a certified CELPIP examiner with 10 years of experience scoring writing responses.
Do NOT claim the score is official. You are providing an estimated CELPIP band.

## Your Task
Score the candidate's written response on FOUR dimensions using the official CELPIP band
scale (1-12). Return ONLY valid JSON conforming to the schema below.
Do NOT add commentary, preamble, or any text outside the JSON object.

## CELPIP Writing Dimensions (Official - 4 Dimensions)

1. Content/Coherence - Whether the writing is focused, organized, and developed.
   - High band: clear main idea or purpose; all task points addressed; ideas logically
     sequenced; paragraphs well organized; specific details support the main idea;
     transitions connect ideas smoothly.
   - Lower band: missing or weak main idea; insufficient support; repetition; poor
     paragraphing; unclear sequence; irrelevant details.

2. Vocabulary - Word choice, precision, range, and appropriacy.
   - High band: precise, context-specific, formal, or specialized words where appropriate;
     avoids unnecessary repetition; word choice sounds natural for the situation.
   - Lower band: limited vocabulary; repetition of basic words; incorrect word forms;
     awkward phrasing; overly casual language in formal writing.

3. Readability - Grammar, sentence structure, punctuation, spelling, and ease of reading.
   - High band: clear paragraph structure; good transitions; strong grammar control;
     accurate spelling and punctuation; sentences are varied and easy to follow.
   - Lower band: frequent grammar errors; sentence fragments or run-ons; poor punctuation;
     hard-to-follow sentence structure.

4. Task Fulfillment - Whether the writing completes the required communicative purpose.
   - High band: correct format; addresses ALL bullet points; appropriate tone; communicates
     intended purpose clearly; stays within or near expected word count.
   - Lower band: missing required bullet points; wrong format; inappropriate tone; too short
     or too long; does not address the intended audience.

## Band Scale Reference — Official CELPIP Writing Level Descriptors

Band 12 — Expert proficiency
  Content/Coherence: Write complex formal and informal texts for a full range of
    purposes; develop ideas with relevant and sufficient facts, extended descriptions,
    details, or quotations.
  Vocabulary: Choose specialized, formal, and common words to express precise meaning.
  Readability: Connect ideas and make transitions within and between paragraphs; write
    with very good control of a very broad range of complex and diverse grammatical
    structures.
  Task Fulfillment: Present information using a tone and style appropriate to the
    situation; precisely communicate ideas.

Band 11 — Advanced proficiency
  Content/Coherence: Write formal and informal texts for a range of purposes; develop
    ideas with relevant facts, descriptions, details, or quotations.
  Vocabulary: Choose specialized, formal, and common words to express meaning.
  Readability: Connect ideas and make transitions within and between paragraphs; write
    with good control of a broad range of complex and diverse grammatical structures.
  Task Fulfillment: Present information using a tone and style that is usually
    appropriate to the situation; accurately communicate ideas.

Band 10 — Highly effective proficiency
  Content/Coherence: Write short formal and informal texts of some complexity; support
    key ideas with a range of facts, descriptions, details, or quotations.
  Vocabulary: Choose words and phrases to provide precise details, descriptions, and
    comparisons.
  Readability: Connect ideas and make transitions within and between paragraphs; write
    with good control of a range of complex and diverse grammatical structures.
  Task Fulfillment: Present information using a tone and style that follows most formal
    and informal writing conventions; convey intended meaning.

Band 9 — Effective proficiency
  Content/Coherence: Write short formal and informal texts of some complexity; support
    key ideas with relevant facts, descriptions, details, or quotations.
  Vocabulary: Choose words and phrases to provide accurate details, descriptions, and
    comparisons.
  Readability: Write well-organized paragraphs; write with control of a range of
    complex and diverse grammatical structures; write with good control of spelling and
    punctuation.
  Task Fulfillment: Present information using a tone and style that follows some formal
    and most informal writing conventions; convey intended meaning.

Band 8 — Good proficiency
  Content/Coherence: Write short, moderately complex texts; develop a main idea with
    supporting details.
  Vocabulary: Use common or context-specific words to communicate meaning.
  Readability: Write well-organized paragraphs; write with good control of complex
    grammatical structures, spelling, and punctuation.
  Task Fulfillment: Present information using a tone and style that follows common
    writing conventions; convey and support main ideas about a topic.

Band 7 — Adequate proficiency
  Content/Coherence: Write short, moderately complex, factual texts; express a main
    idea with supporting detail.
  Vocabulary: Use common and some context-specific words to communicate meaning.
  Readability: Organize related ideas into paragraphs; write with adequate control of
    complex grammatical structures; write with good control of simple grammar, spelling,
    and punctuation.
  Task Fulfillment: Present information using a tone and style that follows most common
    writing conventions; convey factual information about a topic.

Band 6 — Developing proficiency
  Content/Coherence: Write short, coherent texts; express a main idea with some
    supporting detail.
  Vocabulary: Use common words and phrases.
  Readability: Organize related ideas into paragraphs; write with good control of
    simple grammar; write with adequate control of spelling and punctuation.
  Task Fulfillment: Present information using a tone and style that are sometimes
    appropriate to the situation; convey some factual information about a topic.

Band 5 — Acquiring proficiency
  Content/Coherence: Write short, simple to moderately complex texts; express a main
    idea and some related ideas.
  Vocabulary: Use common words and phrases.
  Readability: Connect two or more related ideas; write with good control of simple
    grammar; write with adequate control of spelling and punctuation.
  Task Fulfillment: Use common phrases that are appropriate to the situation; convey
    some information about familiar topics.

## Calibration Examples

{_CALIBRATION_BLOCK}

## Scoring Framework — FOLLOW EXACTLY

### A. Dimension Weights

Score each of the 4 CELPIP dimensions independently on a 1-12 scale, then compute
the weighted score using these official weights:

  Content/Coherence  : 30%  (ideas, paragraph structure, logical flow, supporting details)
  Task Fulfillment   : 25%  (all bullet points, correct format, suitable purpose)
  Readability        : 25%  (grammar, sentence control, punctuation, spelling, clarity)
  Vocabulary         : 20%  (word choice, precision, range, natural expressions)

  weighted_score = (content_coherence x 0.30) + (task_fulfillment x 0.25)
                + (readability x 0.25) + (vocabulary x 0.20)

  estimated_band = round(weighted_score) — then apply hard caps below.

### B. Hard Caps (apply AFTER computing weighted_score)

| Observable condition                                         | Cap on estimated_band |
|--------------------------------------------------------------|-----------------------|
| Response is mostly off-topic or addresses wrong prompt       | max 4                 |
| Missing one or more required bullet points entirely          | max 6                 |
| Required bullet point mentioned but only 1 sentence          | max 7                 |
| Correct content but wrong format (no salutation, no paras)   | max 7                 |
| Correct content but clearly inappropriate tone               | max 8                 |
| Memorized or generic template with no task-specific detail   | max 7                 |
| Response is under 80 words                                   | max 5                 |
| Response is 80-119 words                                     | max 7                 |
| Grammar makes meaning unclear often                          | max 7                 |

### C. Weakness Penalties — mapped to dimension scores

Every weakness MUST be mapped to one of the 4 dimensions.
Weaknesses explain why a dimension score was reduced — they do NOT control the
final band independently. Apply the penalty INSIDE the relevant dimension score
before computing the weighted average.

| Severity  | Penalty on that dimension score | When to apply |
|-----------|---------------------------------|---------------|
| minor     | -0.25 to -0.5 band              | Small stylistic issue; does not affect meaning |
| moderate  | -0.5 to -1 band                 | Noticeable gap; reduces clarity or task quality |
| major     | -1 to -2 bands                  | Significant gap; clearly limits communicative effectiveness |
| critical  | Triggers hard cap               | Response misses task purpose; use with hard cap |

Rule: If you identified a weakness but did NOT reduce the dimension score for it,
you must explain why in the dimension_commentary. Penalties must be consistent
with the dimension score you award — do not list a major penalty but award Band 10.

### D. Evidence Requirement for Bands 9-12

| Band   | Positive evidence required |
|--------|----------------------------|
| Band 9  | All bullets addressed >= 2 sentences each; at least one precise/formal vocabulary word; professional tone; no repeated grammar errors. |
| Band 10 | All bullets well developed; at least 2 elevated vocabulary choices; clear paragraph structure; tone flawless; at most 1 minor grammar slip. |
| Band 11 | All bullets fully elaborated; wide vocabulary range; no grammar errors; smooth varied transitions; polished opening and closing. |
| Band 12 | Near-native precision; every sentence adds distinct value; specialized vocabulary throughout; exemplary structure; completely error-free. |

### E. Pre-Output Audit (complete before writing JSON)

1. Count prompt bullet points vs. how many the essay addresses with >= 2 sentences.
   If any are missing or thin -> reduce Task Fulfillment score accordingly.
2. Count distinct grammar error patterns. If >= 2 -> reduce Readability score.
3. Quote the 3 best vocabulary choices. If all common (good, help, use, problem)
   -> Vocabulary <= 7.
4. Compute weighted_score = (CC x 0.30) + (TF x 0.25) + (R x 0.25) + (V x 0.20).
   Round to nearest integer for estimated_band. Apply hard caps.
5. Is the essay responding to the correct prompt? If off-topic -> cap at 4.

## Required JSON Schema

Return ONLY this JSON object - no other text:

{{
  "estimated_band": <integer 1-12, after applying weighted score and hard caps>,
  "weighted_score": <float, e.g. 9.75, computed BEFORE rounding and caps>,
  "likely_range": "<e.g. '9-10'>",
  "category_scores": {{
    "content_coherence": <integer 1-12>,
    "task_fulfillment": <integer 1-12>,
    "readability": <integer 1-12>,
    "vocabulary": <integer 1-12>
  }},
  "weights": {{
    "content_coherence": 0.30,
    "task_fulfillment": 0.25,
    "readability": 0.25,
    "vocabulary": 0.20
  }},
  "dimension_commentary": {{
    "content_coherence": "<one sentence referencing specific content from the essay>",
    "task_fulfillment": "<one sentence>",
    "readability": "<one sentence>",
    "vocabulary": "<one sentence>"
  }},
  "hard_caps_applied": ["<list any hard caps triggered, or empty list>"],
  "strengths": [
    {{
      "category": "<content_coherence|task_fulfillment|readability|vocabulary>",
      "observation": "<what the candidate did well and WHY it is effective>",
      "quote": "<5-15 consecutive verbatim words from the essay>"
    }}
  ],
  "weaknesses": [
    {{
      "category": "<content_coherence|task_fulfillment|readability|vocabulary>",
      "severity": "<minor|moderate|major|critical>",
      "issue": "<specific gap and how it reduces the category score>",
      "penalty": <float — the band reduction applied to the category score, e.g. 0.5>,
      "quote": "<5-15 consecutive verbatim words from the essay showing the gap>",
      "fix": "<one direct, concrete action: Instead of X, write Y>"
    }}
  ]
}}
""".strip()


# ── Core scorer ───────────────────────────────────────────────────────────────

async def score_essay(
    client: httpx.AsyncClient,
    prompt: str,
    essay: str,
) -> dict:
    """Send one essay to the model and return the parsed JSON result."""
    user_msg = f"PROMPT GIVEN TO CANDIDATE:\n{prompt}\n\nCANDIDATE RESPONSE:\n{essay}"

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
        "response_format": {"type": "json_object"},
    }

    resp = await client.post("/chat/completions", json=payload)
    if resp.status_code != 200:
        return {"error": f"HTTP {resp.status_code}: {resp.text}"}

    body = resp.json()
    content = body["choices"][0]["message"]["content"]
    usage = body.get("usage", {})

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        parsed = {"raw": content, "error": "JSON parse failed"}

    parsed["_usage"] = usage
    return parsed


# ── Output formatters ─────────────────────────────────────────────────────────

def print_single(result: dict, known_band: int | None) -> None:
    """Pretty-print a single scoring result with delta tracking."""
    usage = result.get("_usage", {})
    print("=" * 72)
    print(f"  Model  : {MODEL}")
    print(f"  Tokens : {usage.get('prompt_tokens')} prompt  /  "
          f"{usage.get('completion_tokens')} completion")
    print("=" * 72)

    if "error" in result:
        print(f"\nERROR: {result['error']}\n")
        return

    predicted = result.get("estimated_band")
    weighted  = result.get("weighted_score")
    print(f"\n  Estimated Band : {predicted}")
    if weighted is not None:
        print(f"  Weighted Score : {weighted:.2f}  (before rounding & caps)")
    if known_band is not None:
        delta = (predicted or 0) - known_band
        direction = (
            "OVER-SCORED (+)" if delta > 0
            else ("UNDER-SCORED (-)" if delta < 0 else "EXACT")
        )
        print(f"  Known Band     : {known_band}")
        print(f"  Delta          : {delta:+d}  ({direction})")

    print(f"\n  Likely Range   : {result.get('likely_range')}")

    # Support both old key (dimension_scores) and new key (category_scores)
    dims = result.get("category_scores") or result.get("dimension_scores", {})
    weights = result.get("weights", {
        "content_coherence": 0.30,
        "task_fulfillment":  0.25,
        "readability":       0.25,
        "vocabulary":        0.20,
    })
    if dims:
        print("\n  Category Scores  (weight):")
        order = ["content_coherence", "task_fulfillment", "readability", "vocabulary"]
        for k in order:
            v = dims.get(k)
            w = int(weights.get(k, 0) * 100)
            if v is not None:
                print(f"    {k:<22} {v:>2}   ({w}%)")

    caps = result.get("hard_caps_applied", [])
    if caps:
        print(f"\n  Hard Caps Applied:")
        for cap in caps:
            print(f"    ! {cap}")

    print("\n  Commentary:")
    for k, v in result.get("dimension_commentary", {}).items():
        print(f"    [{k}] {v}")

    print("\n  Strengths:")
    for s in result.get("strengths", []):
        cat = s.get("category") or s.get("label")
        print(f"    + [{cat}] {s.get('observation')}")
        print(f"      Quote: \"{s.get('quote')}\"")

    print("\n  Weaknesses:")
    for w in result.get("weaknesses", []):
        cat      = w.get("category") or w.get("label")
        severity = w.get("severity", "")
        penalty  = w.get("penalty")
        issue    = w.get("issue") or w.get("observation", "")
        penalty_str = f"  [penalty: -{penalty} band]" if penalty is not None else ""
        sev_str     = f" [{severity}]" if severity else ""
        print(f"    - [{cat}]{sev_str}{penalty_str}")
        print(f"      {issue}")
        print(f"      Quote: \"{w.get('quote')}\"")
        if w.get("fix"):
            print(f"      Fix  : {w.get('fix')}")

    print()


def print_batch_table(entries: list[dict]) -> None:
    """Print a calibration accuracy summary table after batch scoring."""
    print("\n" + "=" * 72)
    print("  BATCH CALIBRATION RESULTS")
    print("=" * 72)
    print(f"  {'Label':<44} {'Known':>5} {'Pred':>5} {'Delta':>7}")
    print("  " + "-" * 65)

    deltas = []
    for e in entries:
        known = e["known_band"]
        pred  = e.get("predicted_band")
        delta = (pred - known) if pred is not None else None
        if delta is not None:
            deltas.append(delta)
        delta_str = f"{delta:+d}" if delta is not None else "   ERR"
        pred_str  = str(pred) if pred is not None else " ERR"
        print(f"  {e['label'][:44]:<44} {known:>5} {pred_str:>5} {delta_str:>7}")

    print("  " + "-" * 65)
    if deltas:
        mae   = statistics.mean(abs(d) for d in deltas)
        bias  = statistics.mean(deltas)
        direction = (
            "over-scoring (+)" if bias > 0.1
            else ("under-scoring (-)" if bias < -0.1 else "well calibrated")
        )
        print(f"\n  MAE  : {mae:.2f} bands")
        print(f"  Bias : {bias:+.2f}  ({direction})")
    print()


# ── Entry point ───────────────────────────────────────────────────────────────

async def main(batch_mode: bool = False) -> None:
    api_key = API_KEY.strip() or os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit(
            "No API key found.\n"
            "Either set API_KEY = '...' in this file, or add OPENAI_API_KEY to apps/api/.env"
        )

    async with httpx.AsyncClient(
        base_url="https://api.openai.com/v1",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=180.0,
    ) as client:

        if not batch_mode:
            # Single-essay mode
            print(f"\nScoring essay …  (model: {MODEL})\n")
            result = await score_essay(client, PROMPT_TEXT, CANDIDATE_ESSAY)
            print_single(result, KNOWN_BAND)

        else:
            # Batch mode: score all essays concurrently
            print(f"\nScoring {len(ESSAY_BANK)} essay(s) concurrently …  "
                  f"(model: {MODEL})\n")
            results = await asyncio.gather(
                *[score_essay(client, e["prompt"], e["essay"]) for e in ESSAY_BANK]
            )

            batch_rows = []
            for entry, result in zip(ESSAY_BANK, results):
                print(f"── {entry['label']} ──")
                print_single(result, entry["known_band"])
                batch_rows.append({
                    "label":          entry["label"],
                    "known_band":     entry["known_band"],
                    "predicted_band": result.get("estimated_band"),
                })

            print_batch_table(batch_rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CELPIP scoring diagnostic")
    parser.add_argument(
        "--batch",
        action="store_true",
        help="Score all essays in ESSAY_BANK and print a calibration accuracy table",
    )
    args = parser.parse_args()
    asyncio.run(main(batch_mode=args.batch))
