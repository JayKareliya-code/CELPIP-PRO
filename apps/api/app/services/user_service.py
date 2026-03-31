from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.repositories.user_repo import UserRepository


async def get_or_create_user(
    db: AsyncSession, clerk_user_id: str, email: str, full_name: str
) -> User:
    repo = UserRepository(db)
    user = await repo.get_by_clerk_id(clerk_user_id)

    if not user:
        try:
            user = await repo.create(
                clerk_user_id=clerk_user_id,
                email=email,
                full_name=full_name,
                plan="starter",
            )
        except IntegrityError:
            # Concurrent first-login race: another request inserted the row first.
            await db.rollback()
            user = await repo.get_by_clerk_id(clerk_user_id)
    else:
        user.last_active_date = date.today()
        await db.flush()

    return user
