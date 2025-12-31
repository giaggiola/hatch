from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.services.matching import get_matches, get_close_calls
from app.models.user import User

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("")
async def get_matches_endpoint(
    search: str | None = Query(default=None, description="Search matches by name prefix"),
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
        search=search,
    )
    return matches


@router.get("/close-calls")
async def get_close_calls_endpoint(
    limit: int = Query(default=20, le=50),
    min_similarity: float = Query(default=0.75, ge=0.5, le=1.0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get close calls - names where partners liked similar (but not same) names.

    For example, if you liked "Maria" and partner liked "Maria del Carmen",
    this will show that as a close call since the names are similar.
    """
    if not current_user.couple_id:
        return []

    close_calls = await get_close_calls(
        db=db,
        couple_id=current_user.couple_id,
        current_user_id=current_user.id,
        limit=limit,
        min_similarity=min_similarity,
    )
    return close_calls
