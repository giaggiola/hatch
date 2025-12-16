import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.invite import Invite
from app.models.user import User


def generate_invite_code() -> str:
    """Generate a human-readable invite code like BABY-7X9K"""
    chars = string.ascii_uppercase + string.digits
    # Remove ambiguous characters
    chars = chars.replace("O", "").replace("0", "").replace("I", "").replace("1", "").replace("L", "")
    code = "".join(secrets.choice(chars) for _ in range(4))
    return f"BABY-{code}"


async def create_invite(
    db: AsyncSession,
    user: User,
    invited_email: Optional[str] = None,
    expires_hours: int = 168,  # 7 days
) -> Invite:
    """Create a new invite for the user's couple"""
    code = generate_invite_code()

    # Ensure code is unique
    while True:
        result = await db.execute(select(Invite).where(Invite.code == code))
        if not result.scalar_one_or_none():
            break
        code = generate_invite_code()

    expires_at = (datetime.utcnow() + timedelta(hours=expires_hours)).isoformat()

    invite = Invite(
        code=code,
        couple_id=user.couple_id,
        invited_by=user.id,
        invited_email=invited_email,
        expires_at=expires_at,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return invite


async def get_invite_by_code(db: AsyncSession, code: str) -> Optional[Invite]:
    """Get an invite by its code"""
    result = await db.execute(select(Invite).where(Invite.code == code.upper()))
    return result.scalar_one_or_none()


async def accept_invite(db: AsyncSession, invite: Invite, user: User) -> bool:
    """Accept an invite and join the couple"""
    # Check if invite is valid
    if invite.status != "pending":
        return False

    # Check if expired
    if invite.expires_at:
        expires = datetime.fromisoformat(invite.expires_at)
        if datetime.utcnow() > expires:
            invite.status = "expired"
            await db.commit()
            return False

    # Join the couple
    user.couple_id = invite.couple_id
    invite.status = "accepted"
    await db.commit()
    return True
