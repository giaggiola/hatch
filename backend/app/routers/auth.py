from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from authlib.integrations.starlette_client import OAuth
from pydantic import BaseModel
import httpx
from app.database import get_db
from app.config import get_settings
from app.services.auth import create_access_token, get_or_create_user, decode_access_token, get_user_by_id
from app.schemas.user import UserResponse
from app.rate_limiter import limiter, RATE_LIMIT_AUTH


class MobileAuthRequest(BaseModel):
    access_token: str

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

# Cookie name (used for reading legacy cookies during transition)
COOKIE_NAME = "auth_token"

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    """Dependency to get current authenticated user.

    Checks for token in:
    1. httpOnly cookie (preferred, secure)
    2. Authorization header (fallback for API clients)
    """
    token = None

    # First check httpOnly cookie
    token = request.cookies.get(COOKIE_NAME)

    # Fallback to Authorization header for API clients
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


@router.get("/google")
@limiter.limit(RATE_LIMIT_AUTH)
async def google_login(request: Request):
    """Redirect to Google OAuth"""
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")

    user_info = token.get("userinfo")
    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to get user info")

    # Check if this is an admin login flow (stored in session before redirect)
    is_admin_flow = request.session.pop("admin_login_flow", False)

    if is_admin_flow:
        # Admin login - check if user is in admin list
        email = user_info.get("email", "").lower()
        if email in settings.admin_email_list:
            request.session["admin_email"] = email
            request.session["admin_name"] = user_info.get("name", email)
            return RedirectResponse(url="/admin", status_code=302)
        else:
            return RedirectResponse(
                url="/admin/login?error=Access%20denied.%20Not%20an%20admin.",
                status_code=302
            )

    # Normal user login flow
    user = await get_or_create_user(
        db=db,
        google_id=user_info["sub"],
        email=user_info["email"],
        display_name=user_info.get("name"),
        avatar_url=user_info.get("picture"),
    )

    access_token = create_access_token(data={"sub": user.id})

    # Redirect to frontend with token in URL
    # The frontend will set the httpOnly cookie on its own domain (same-origin)
    # This avoids cross-site cookie issues on mobile browsers (ITP)
    redirect_url = f"{settings.frontend_url}/auth/callback?token={access_token}"
    return RedirectResponse(url=redirect_url, status_code=302)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    """Get current user info"""
    return current_user


@router.post("/logout")
async def logout():
    """Logout endpoint - frontend handles clearing its own cookie"""
    return {"message": "Logged out successfully"}


@router.post("/dev-login")
async def dev_login(db: AsyncSession = Depends(get_db)):
    """
    Dev login endpoint for simulator testing.
    Only available when DEBUG=true.
    Creates or returns a test user.
    """
    if not settings.debug:
        raise HTTPException(status_code=404, detail="Not found")

    # Create or get a dev test user
    user = await get_or_create_user(
        db=db,
        google_id="dev-test-user-12345",
        email="dev@test.local",
        display_name="Dev Tester",
        avatar_url=None,
    )

    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/google/mobile")
@limiter.limit(RATE_LIMIT_AUTH)
async def google_mobile_auth(
    request: Request,
    body: MobileAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Mobile OAuth endpoint.
    Accepts a Google access token from mobile app, verifies it,
    and returns a JWT for the app to store.
    """
    try:
        # Verify the Google access token by fetching user info
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {body.access_token}"}
            )

            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google token")

            user_info = response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify token: {str(e)}")

    # Get or create user
    user = await get_or_create_user(
        db=db,
        google_id=user_info["sub"],
        email=user_info["email"],
        display_name=user_info.get("name"),
        avatar_url=user_info.get("picture"),
    )

    # Create JWT
    access_token = create_access_token(data={"sub": user.id})

    return {"access_token": access_token, "token_type": "bearer"}
