from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.services.matching import get_matches
from app.models.user import User

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("")
async def get_matches_endpoint(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all matches for the couple"""
    if not current_user.couple_id:
        return []

    matches = await get_matches(
        db=db,
        couple_id=current_user.couple_id,
        limit=limit,
        offset=offset,
    )
    return matches
