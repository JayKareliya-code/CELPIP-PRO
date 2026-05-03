from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.repositories.user_repo import UserRepository


def _update_streak(user: User, today: date) -> None:
    """Increment, maintain, or reset the user's practice streak.

    Rules:
      - First active day ever          → streak = 1
      - Active again today (same day)  → no change (already counted)
      - Active yesterday               → streak += 1
      - Gap of 2+ days                 → streak resets to 1

    ``today`` is the caller-provided local date (from X-User-Date header)
    so that streak logic is based on the user's clock, not the server's UTC date.
    """
    last = user.last_active_date

    if last is None:
        # Brand new first session
        user.streak_days = 1
    elif last == today:
        # Already counted today — nothing to do
        pass
    elif last == today - timedelta(days=1):
        # Consecutive day — keep the chain going
        user.streak_days = (user.streak_days or 0) + 1
    else:
        # Missed one or more days — reset
        user.streak_days = 1

    user.last_active_date = today


async def get_or_create_user(
    db: AsyncSession, clerk_user_id: str, email: str, full_name: str,
    user_date: date | None = None,
) -> User:
    """Fetch (or create) the local User row and update the streak.

    ``user_date`` should be the user's local calendar date, derived from the
    ``X-User-Date`` request header.  Falls back to the server date when absent.
    """
    today = user_date or date.today()
    repo = UserRepository(db)
    user = await repo.get_by_clerk_id(clerk_user_id)

    if not user:
        try:
            user = await repo.create(
                clerk_user_id=clerk_user_id,
                email=email,
                full_name=full_name,
                plan="starter",
                streak_days=1,
                last_active_date=today,
            )
        except IntegrityError:
            # Concurrent first-login race: another request inserted the row first.
            await db.rollback()
            user = await repo.get_by_clerk_id(clerk_user_id)
    else:
        _update_streak(user, today)
        # Sync email / name in case they were previously stored as the
        # clerk.local fallback (before the JWT template included email).
        if email and not email.endswith("@clerk.local") and user.email != email:
            user.email = email
        if full_name and user.full_name != full_name:
            user.full_name = full_name
        await db.flush()

    return user
