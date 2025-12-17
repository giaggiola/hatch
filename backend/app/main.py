from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.middleware.sessions import SessionMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.config import get_settings
from app.routers import auth, users, invites, names, swipes, matches, preferences
from app.admin import setup_admin
from app.rate_limiter import limiter

settings = get_settings()

app = FastAPI(
    title="Hatch API",
    description="Swipe on baby names with your partner - match on your favorites",
    version="1.0.0",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup admin panel at /admin
setup_admin(app)

# Session middleware (required for OAuth)
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(invites.router, prefix="/api")
app.include_router(names.router, prefix="/api")
app.include_router(swipes.router, prefix="/api")
app.include_router(matches.router, prefix="/api")
app.include_router(preferences.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Hatch API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = Path(__file__).parent / "static" / "favicon.ico"
    return FileResponse(favicon_path, media_type="image/x-icon")
