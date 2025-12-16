import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.invite import InviteCreate, InviteResponse, InviteDetailResponse
from app.services.invite import create_invite, get_invite_by_code, accept_invite
from app.services.email import send_invite_email
from app.models.user import User
from app.rate_limiter import limiter, RATE_LIMIT_INVITE

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invites", tags=["invites"])


@router.post("", response_model=InviteResponse)
@limiter.limit(RATE_LIMIT_INVITE)
async def create_invite_endpoint(
    request: Request,  # Required for rate limiter
    invite_data: InviteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new invite link"""
    if not current_user.couple_id:
        raise HTTPException(status_code=400, detail="User must be in a couple to create invites")

    invite = await create_invite(
        db=db,
        user=current_user,
        invited_email=invite_data.invited_email,
    )

    # Send invite email if email was provided
    if invite_data.invited_email:
        try:
            await send_invite_email(
                to_email=invite_data.invited_email,
                invite_code=invite.code,
                inviter_name=current_user.display_name or "Someone",
            )
        except Exception as e:
            # Log but don't fail the request - invite is still created
            logger.warning(f"Failed to send invite email: {e}")

    return invite


@router.get("/{code}", response_model=InviteDetailResponse)
async def get_invite(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    """Get invite details by code"""
    invite = await get_invite_by_code(db, code)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    # Get inviter's name
    result = await db.execute(select(User).where(User.id == invite.invited_by))
    inviter = result.scalar_one_or_none()

    return InviteDetailResponse(
        code=invite.code,
        status=invite.status,
        invited_by_name=inviter.display_name if inviter else None,
    )


@router.post("/{code}/accept")
async def accept_invite_endpoint(
    code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept an invite and join the couple"""
    invite = await get_invite_by_code(db, code)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    # Check if user is already in a different couple with another member
    if current_user.couple_id and current_user.couple_id != invite.couple_id:
        result = await db.execute(
            select(User).where(
                User.couple_id == current_user.couple_id,
                User.id != current_user.id,
            )
        )
        has_partner = result.scalar_one_or_none()
        if has_partner:
            raise HTTPException(
                status_code=400,
                detail="You are already in a couple with another partner"
            )

    success = await accept_invite(db, invite, current_user)
    if not success:
        raise HTTPException(status_code=400, detail="Invite is expired or already used")

    return {"message": "Successfully joined couple"}
