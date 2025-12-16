from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.preference import PreferenceUpdate, PreferenceResponse
from app.models.preference import UserPreference
from app.models.user import User
import json

router = APIRouter(prefix="/preferences", tags=["preferences"])


@router.get("", response_model=PreferenceResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's filter preferences"""
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    pref = result.scalar_one_or_none()

    if not pref:
        return PreferenceResponse()

    return PreferenceResponse(
        origins=json.loads(pref.origins) if pref.origins else [],
        genders=json.loads(pref.genders) if pref.genders else [],
        starting_letters=json.loads(pref.starting_letters) if pref.starting_letters else [],
        max_length=pref.max_length,
    )


@router.put("", response_model=PreferenceResponse)
async def update_preferences(
    update: PreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user's filter preferences"""
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    pref = result.scalar_one_or_none()

    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)

    if update.origins is not None:
        pref.origins = json.dumps(update.origins)
    if update.genders is not None:
        pref.genders = json.dumps(update.genders)
    if update.starting_letters is not None:
        pref.starting_letters = json.dumps(update.starting_letters)
    if update.max_length is not None:
        pref.max_length = update.max_length

    await db.commit()
    await db.refresh(pref)

    return PreferenceResponse(
        origins=json.loads(pref.origins) if pref.origins else [],
        genders=json.loads(pref.genders) if pref.genders else [],
        starting_letters=json.loads(pref.starting_letters) if pref.starting_letters else [],
        max_length=pref.max_length,
    )
