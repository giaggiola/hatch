from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings
from app.models.user import User
from app.models.couple import Couple
from app.models.preference import UserPreference

settings = get_settings()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


async def get_or_create_user(
    db: AsyncSession,
    google_id: str,
    email: str,
    display_name: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> User:
    # Check if user exists
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user:
        # Update user info if changed
        user.email = email
        if display_name:
            user.display_name = display_name
        if avatar_url:
            user.avatar_url = avatar_url
        await db.commit()
        await db.refresh(user)
        return user

    # Create new user with a new couple
    couple = Couple()
    db.add(couple)
    await db.flush()

    user = User(
        google_id=google_id,
        email=email,
        display_name=display_name,
        avatar_url=avatar_url,
        couple_id=couple.id,
    )
    db.add(user)
    await db.flush()

    # Update couple with creator
    couple.created_by = user.id

    # Create default preferences
    preferences = UserPreference(user_id=user.id)
    db.add(preferences)

    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
