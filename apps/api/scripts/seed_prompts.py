"""Seed script — populates speaking and writing prompts for local development.

Usage:
    python scripts/seed_prompts.py

Requires DATABASE_URL to be set in .env or environment.
"""
import asyncio
import sys
from pathlib import Path

# Ensure 'apps/api' is on sys.path when run from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.models.base import Base
from app.models.prompt import SpeakingPrompt, WritingPrompt

SPEAKING_PROMPTS = [
    dict(
        task_number=1,
        title="Describe Your Favourite Season",
        prompt_text="Talk about your favourite season of the year. Describe what you like about it and what activities you enjoy doing during that time.",
        prep_time_seconds=30,
        response_time_seconds=60,
        difficulty="easy",
        vocabulary_tips=["refreshing", "vibrant", "cozy", "picturesque"],
        connector_phrases=["In addition to", "Not only that, but", "What's more"],
        template_hint="Start with a clear opinion statement, give 2–3 reasons, and close with a personal memory.",
    ),
    dict(
        task_number=2,
        title="Describe the Image: City Park",
        prompt_text="Look at the image and describe what you see. Describe the people, setting, and any activities taking place.",
        prep_time_seconds=30,
        response_time_seconds=60,
        difficulty="easy",
        vocabulary_tips=["foreground", "background", "to the left", "engaged in"],
        connector_phrases=["In the foreground", "On the right side", "It appears that"],
        template_hint="Describe left-to-right, near-to-far. Speculate on purpose/feeling.",
    ),
    dict(
        task_number=3,
        title="Predict the Outcome: Graph Analysis",
        prompt_text="Based on the graph shown, predict what will likely happen in the next five years and explain your reasoning.",
        prep_time_seconds=30,
        response_time_seconds=60,
        difficulty="medium",
        vocabulary_tips=["trend", "steadily", "fluctuate", "plateau"],
        connector_phrases=["Based on the data", "It is likely that", "As a result of"],
        template_hint="State the current trend, project forward with reasons, acknowledge uncertainty.",
    ),
    dict(
        task_number=4,
        title="Express Your Opinion: Remote Work",
        prompt_text="Some people believe remote work is better than working in an office. Do you agree or disagree? Explain your opinion with reasons and examples.",
        prep_time_seconds=30,
        response_time_seconds=60,
        difficulty="medium",
        vocabulary_tips=["productivity", "flexibility", "collaboration", "isolation"],
        connector_phrases=["On the other hand", "From my perspective", "This is evident when"],
        template_hint="State position clearly → 2 reasons → concede 1 counterpoint → restate position.",
    ),
    dict(
        task_number=5,
        title="Compare Two Images: Urban vs Rural",
        prompt_text="Compare the two images shown. Describe the similarities and differences between urban and rural living environments.",
        prep_time_seconds=60,
        response_time_seconds=90,
        difficulty="medium",
        has_parts=True,
        part_count=2,
        vocabulary_tips=["bustling", "serene", "infrastructure", "community"],
        connector_phrases=["In contrast", "Similarly", "Whereas"],
        template_hint="Image 1 description → Image 2 description → direct comparison.",
    ),
    dict(
        task_number=6,
        title="Make a Recommendation: Travel Destinations",
        prompt_text="A friend is planning their first international trip and has asked for your advice. Based on the information provided, which destination would you recommend and why?",
        prep_time_seconds=60,
        response_time_seconds=90,
        difficulty="medium",
        vocabulary_tips=["recommend", "consider", "budget", "experience"],
        connector_phrases=["I would suggest", "Given that", "Taking into account"],
        template_hint="State recommendation → 3 supporting reasons → address the alternative → conclude.",
    ),
    dict(
        task_number=7,
        title="Discuss a Problem and Solution: Traffic Congestion",
        prompt_text="Describe the traffic congestion problem shown in the image and suggest at least two practical solutions.",
        prep_time_seconds=60,
        response_time_seconds=90,
        difficulty="hard",
        vocabulary_tips=["congestion", "commute", "infrastructure", "incentive"],
        connector_phrases=["One effective solution would be", "Furthermore", "This could be achieved by"],
        template_hint="Define the problem clearly → Solution 1 with detail → Solution 2 with detail → conclude.",
    ),
    dict(
        task_number=8,
        title="Argue a Position: Social Media Regulation",
        prompt_text="Should social media platforms be regulated by governments? Present a well-structured argument supporting your position with specific examples.",
        prep_time_seconds=60,
        response_time_seconds=120,
        difficulty="hard",
        vocabulary_tips=["regulate", "misinformation", "privacy", "accountability"],
        connector_phrases=["It is imperative that", "Evidence suggests", "Critics argue, however"],
        template_hint="Hook → clear thesis → 3 arguments → refute counterargument → strong conclusion.",
    ),
]

WRITING_PROMPTS = [
    dict(
        task_number=1,
        title="Describe a Graph or Chart",
        prompt_text="The graph below shows the percentage of households in three countries that had access to the internet between 2000 and 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.",
        task_type="graph_description",
        min_words=150,
        max_words=200,
        time_limit_seconds=1200,
        difficulty="medium",
        idea_hints=[
            "Identify the overall trend",
            "Compare the highest and lowest values",
            "Note any significant changes or exceptions",
        ],
        intro_template="The graph illustrates the proportion of households with internet access in {countries} over a {period} period.",
        conclusion_template="Overall, internet access grew significantly across all three countries, with {leading_country} consistently leading.",
    ),
    dict(
        task_number=2,
        title="Write an Argumentative Essay",
        prompt_text="Some people believe that university education should be free for all students, while others argue that students should pay tuition fees. Discuss both views and give your own opinion.",
        task_type="argumentative_essay",
        min_words=200,
        max_words=None,
        time_limit_seconds=1800,
        difficulty="hard",
        idea_hints=[
            "Free education: equal access, economic returns to society",
            "Tuition fees: personal investment, sustainable funding",
            "Consider hybrid models (income-contingent loans)",
        ],
        intro_template="The question of whether higher education should be free is one of considerable debate. While proponents argue {view_1}, others contend that {view_2}.",
        conclusion_template="In conclusion, while both perspectives have merit, I believe that {your_position} because {reason}.",
    ),
]


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async with session_maker() as session:
        async with session.begin():
            for data in SPEAKING_PROMPTS:
                session.add(SpeakingPrompt(**data))
            for data in WRITING_PROMPTS:
                session.add(WritingPrompt(**data))

    await engine.dispose()
    print(f"✅ Seeded {len(SPEAKING_PROMPTS)} speaking prompts and {len(WRITING_PROMPTS)} writing prompts.")


if __name__ == "__main__":
    asyncio.run(seed())
