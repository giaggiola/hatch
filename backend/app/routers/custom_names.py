from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.custom_name import CustomNameCreate, CustomNameResponse
from app.models.custom_name import CustomName
from app.models.user import User

router = APIRouter(prefix="/custom-names", tags=["custom-names"])


@router.post("", response_model=CustomNameResponse)
async def create_custom_name(
    data: CustomNameCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a custom name for the couple to swipe on."""
    if not current_user.couple_id:
        raise HTTPException(status_code=400, detail="You must be in a couple to add custom names")

    # Check for duplicates within the couple
    existing = await db.execute(
        select(CustomName).where(
            CustomName.couple_id == current_user.couple_id,
            CustomName.name == data.name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This name already exists in your list")

    custom_name = CustomName(
        user_id=current_user.id,
        couple_id=current_user.couple_id,
        name=data.name.strip(),
        gender=data.gender,
    )
    db.add(custom_name)
    await db.commit()
    await db.refresh(custom_name)

    return CustomNameResponse.model_validate(custom_name)


@router.get("", response_model=list[CustomNameResponse])
async def get_custom_names(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all custom names for the current couple."""
    if not current_user.couple_id:
        return []

    result = await db.execute(
        select(CustomName)
        .where(CustomName.couple_id == current_user.couple_id)
        .order_by(CustomName.created_at.desc())
    )
    custom_names = result.scalars().all()

    return [CustomNameResponse.model_validate(cn) for cn in custom_names]


@router.delete("/{custom_name_id}")
async def delete_custom_name(
    custom_name_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a custom name (only the creator can delete it)."""
    result = await db.execute(
        select(CustomName).where(
            CustomName.id == custom_name_id,
            CustomName.user_id == current_user.id,
        )
    )
    custom_name = result.scalar_one_or_none()

    if not custom_name:
        raise HTTPException(status_code=404, detail="Custom name not found or you don't have permission to delete it")

    await db.execute(delete(CustomName).where(CustomName.id == custom_name_id))
    await db.commit()

    return {"message": "Custom name deleted"}
