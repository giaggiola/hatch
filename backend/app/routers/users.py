from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.user import UserUpdate, UserResponse, PartnerResponse
from app.models.user import User
from app.models.swipe import Swipe
from app.models.preference import UserPreference
from sqlalchemy import select

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=UserResponse)
async def update_user(
    update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's info"""
    if update.display_name is not None:
        current_user.display_name = update.display_name
    if update.family_name is not None:
        current_user.family_name = update.family_name

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.delete("/me")
async def delete_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete current user and all their data"""
    # Delete user's swipes
    await db.execute(delete(Swipe).where(Swipe.user_id == current_user.id))

    # Delete user's preferences
    await db.execute(delete(UserPreference).where(UserPreference.user_id == current_user.id))

    # Delete user
    await db.delete(current_user)
    await db.commit()

    return {"message": "Account deleted successfully"}


@router.get("/partner", response_model=PartnerResponse | None)
async def get_partner(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get partner info if in a couple"""
    if not current_user.couple_id:
        return None

    result = await db.execute(
        select(User).where(
            User.couple_id == current_user.couple_id,
            User.id != current_user.id,
        )
    )
    partner = result.scalar_one_or_none()
    return partner
