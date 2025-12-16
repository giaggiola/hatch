from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.swipe import (
    SwipeCreate, SwipeUpdate, SwipeResponse, SwipeResultResponse,
    BatchSwipeCreate, BatchSwipeResultResponse
)
from app.schemas.name import NameResponse
from app.models.swipe import Swipe
from app.models.name import Name
from app.models.user import User
from app.services.matching import check_for_match
from app.rate_limiter import limiter, RATE_LIMIT_SWIPE
from typing import Literal

router = APIRouter(prefix="/swipes", tags=["swipes"])


@router.get("/check/{name_id}")
async def check_swipe_status(
    name_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if a name has been swiped by the current user.

    Returns the swipe action if exists, otherwise null.
    This is more efficient than fetching all swipes just to check one name.
    """
    result = await db.execute(
        select(Swipe.action).where(
            Swipe.user_id == current_user.id,
            Swipe.name_id == name_id,
        )
    )
    action = result.scalar_one_or_none()
    return {"action": action}


@router.post("", response_model=SwipeResultResponse)
@limiter.limit(RATE_LIMIT_SWIPE)
async def create_swipe(
    request: Request,  # Required for rate limiter
    swipe_data: SwipeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Record a swipe on a single name and check for match."""
    if not current_user.couple_id:
        raise HTTPException(status_code=400, detail="User must be in a couple to swipe")

    # Check if name exists
    name_result = await db.execute(select(Name).where(Name.id == swipe_data.name_id))
    name = name_result.scalar_one_or_none()
    if not name:
        raise HTTPException(status_code=404, detail="Name not found")

    # Check if already swiped
    existing = await db.execute(
        select(Swipe).where(
            Swipe.user_id == current_user.id,
            Swipe.name_id == swipe_data.name_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already swiped on this name")

    # Create swipe
    swipe = Swipe(
        user_id=current_user.id,
        name_id=swipe_data.name_id,
        couple_id=current_user.couple_id,
        action=swipe_data.action,
    )
    db.add(swipe)
    await db.commit()

    # Check for match if this was a like
    is_match = False
    if swipe_data.action == "like":
        is_match = await check_for_match(
            db=db,
            couple_id=current_user.couple_id,
            name_id=swipe_data.name_id,
            current_user_id=current_user.id,
        )

    return SwipeResultResponse(
        match=is_match,
        name=NameResponse.model_validate(name) if is_match else None,
    )


@router.post("/batch", response_model=BatchSwipeResultResponse)
@limiter.limit(RATE_LIMIT_SWIPE)
async def create_batch_swipes(
    request: Request,  # Required for rate limiter
    batch_data: BatchSwipeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create multiple swipes at once (used when swiping on a card).
    Skips names that were already swiped.
    Returns count of created swipes and any matches found.
    """
    if not current_user.couple_id:
        raise HTTPException(status_code=400, detail="User must be in a couple to swipe")

    if not batch_data.swipes:
        raise HTTPException(status_code=400, detail="No swipes provided")

    # Get all name_ids to process
    name_ids = [s.name_id for s in batch_data.swipes]

    # Verify all names exist
    names_result = await db.execute(select(Name).where(Name.id.in_(name_ids)))
    names = {n.id: n for n in names_result.scalars().all()}

    missing = set(name_ids) - set(names.keys())
    if missing:
        raise HTTPException(status_code=404, detail=f"Names not found: {missing}")

    # Get already swiped name_ids for this user
    existing_result = await db.execute(
        select(Swipe.name_id).where(
            Swipe.user_id == current_user.id,
            Swipe.name_id.in_(name_ids),
        )
    )
    already_swiped = {row[0] for row in existing_result.fetchall()}

    # Create swipes for names not already swiped
    created_count = 0
    matches = []

    for swipe_data in batch_data.swipes:
        if swipe_data.name_id in already_swiped:
            continue  # Skip already swiped

        swipe = Swipe(
            user_id=current_user.id,
            name_id=swipe_data.name_id,
            couple_id=current_user.couple_id,
            action=swipe_data.action,
        )
        db.add(swipe)
        created_count += 1

        # Check for match if this was a like
        if swipe_data.action == "like":
            is_match = await check_for_match(
                db=db,
                couple_id=current_user.couple_id,
                name_id=swipe_data.name_id,
                current_user_id=current_user.id,
            )
            if is_match:
                matches.append(NameResponse.model_validate(names[swipe_data.name_id]))

    await db.commit()

    return BatchSwipeResultResponse(
        created=created_count,
        matches=matches,
    )


@router.get("", response_model=list[SwipeResponse])
async def get_swipes(
    action: Literal["like", "dismiss"] | None = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get swipe history for current user."""
    # Use JOIN to fetch swipes with names in a single query (fixes N+1)
    query = (
        select(Swipe, Name)
        .join(Name, Swipe.name_id == Name.id)
        .where(Swipe.user_id == current_user.id)
    )

    if action:
        query = query.where(Swipe.action == action)

    query = query.order_by(Swipe.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    rows = result.fetchall()

    responses = [
        SwipeResponse(
            id=swipe.id,
            name_id=swipe.name_id,
            action=swipe.action,
            created_at=swipe.created_at,
            name=NameResponse.model_validate(name) if name else None,
        )
        for swipe, name in rows
    ]

    return responses


@router.patch("/{name_id}", response_model=SwipeResultResponse)
async def update_swipe(
    name_id: str,
    update: SwipeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change a previous swipe (e.g., from dismiss to like)."""
    result = await db.execute(
        select(Swipe).where(
            Swipe.user_id == current_user.id,
            Swipe.name_id == name_id,
        )
    )
    swipe = result.scalar_one_or_none()
    if not swipe:
        raise HTTPException(status_code=404, detail="Swipe not found")

    swipe.action = update.action
    await db.commit()

    # Check for match if changed to like
    is_match = False
    if update.action == "like":
        is_match = await check_for_match(
            db=db,
            couple_id=current_user.couple_id,
            name_id=name_id,
            current_user_id=current_user.id,
        )

    name_result = await db.execute(select(Name).where(Name.id == name_id))
    name = name_result.scalar_one_or_none()

    return SwipeResultResponse(
        match=is_match,
        name=NameResponse.model_validate(name) if is_match else None,
    )


@router.delete("/{name_id}")
async def delete_swipe(
    name_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a swipe (name goes back to queue)."""
    result = await db.execute(
        delete(Swipe).where(
            Swipe.user_id == current_user.id,
            Swipe.name_id == name_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Swipe not found")

    await db.commit()
    return {"message": "Swipe removed"}
