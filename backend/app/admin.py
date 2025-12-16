"""
SQLAdmin configuration for the Hatch API.
Access at /admin
"""
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse
from app.database import sync_engine
from app.models.name import Name
from app.models.name_fact import NameFact
from app.models.user import User
from app.models.couple import Couple
from app.models.swipe import Swipe
from app.models.invite import Invite
from app.models.preference import UserPreference
from app.config import get_settings
from app.routers.auth import oauth  # Use the same OAuth instance as auth router

settings = get_settings()


class AdminAuth(AuthenticationBackend):
    """Google OAuth authentication for SQLAdmin."""

    async def login(self, request: Request) -> bool:
        """
        Handle login - redirect to Google OAuth.
        SQLAdmin calls this when the login form is submitted.
        We ignore the form and redirect to Google instead.
        """
        callback_url = f"{settings.backend_url}/api/auth/google/callback"
        return await oauth.google.authorize_redirect(request, callback_url)

    async def logout(self, request: Request) -> bool:
        """Clear session on logout."""
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        """Check if user is authenticated and is an admin."""
        return "admin_email" in request.session


class NameAdmin(ModelView, model=Name):
    column_list = [
        Name.name, Name.gender, Name.length,
        "facts.origin_language", "facts.meaning"
    ]
    column_labels = {
        "name": "Name",
        "gender": "G",
        "length": "Len",
        "facts.origin_language": "Origin",
        "facts.meaning": "Meaning",
    }
    column_searchable_list = [Name.name]
    column_sortable_list = [
        Name.name, Name.gender, Name.length
    ]
    column_default_sort = [(Name.name, False)]
    page_size = 100
    page_size_options = [50, 100, 200, 500]
    name = "Name"
    name_plural = "Names"
    icon = "fa-solid fa-baby"


class NameFactAdmin(ModelView, model=NameFact):
    column_list = [
        "name", NameFact.origin_language, NameFact.meaning,
        NameFact.nicknames, NameFact.created_at
    ]
    column_labels = {
        "name": "Name",
        "origin_language": "Origin",
        "meaning": "Meaning",
        "nicknames": "Nicknames",
        "created_at": "Created",
    }
    column_searchable_list = [NameFact.origin_language, NameFact.meaning]
    column_sortable_list = [NameFact.origin_language, NameFact.created_at]
    column_default_sort = [(NameFact.created_at, True)]
    page_size = 50
    page_size_options = [25, 50, 100]
    name = "Name Fact"
    name_plural = "Name Facts"
    icon = "fa-solid fa-book"

    # Show all fields in detail/edit view
    form_columns = [
        "name", "origin_language", "meaning", "nicknames",
        "historical_figures", "fictional_characters", "cultural_references"
    ]


class UserAdmin(ModelView, model=User):
    column_list = [User.display_name, User.email, "couple", User.created_at]
    column_labels = {
        "display_name": "Name",
        "email": "Email",
        "couple": "Couple",
        "created_at": "Created",
    }
    column_searchable_list = [User.email, User.display_name]
    column_sortable_list = [User.email, User.display_name, User.created_at]
    column_default_sort = [(User.created_at, True)]
    page_size = 25
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"


class CoupleAdmin(ModelView, model=Couple):
    column_list = ["users", Couple.created_at]
    column_labels = {
        "users": "Partners",
        "created_at": "Created",
    }
    column_sortable_list = [Couple.created_at]
    column_default_sort = [(Couple.created_at, True)]
    page_size = 25
    name = "Couple"
    name_plural = "Couples"
    icon = "fa-solid fa-heart"


class SwipeAdmin(ModelView, model=Swipe):
    column_list = ["user", Swipe.action, "name", Swipe.created_at]
    column_labels = {
        "user": "User",
        "action": "Action",
        "name": "Name",
        "created_at": "When",
    }
    column_sortable_list = [Swipe.action, Swipe.created_at]
    column_default_sort = [(Swipe.created_at, True)]
    page_size = 50
    name = "Swipe"
    name_plural = "Swipes"
    icon = "fa-solid fa-hand-pointer"

    column_formatters = {
        Swipe.action: lambda m, a: "❤️ like" if m.action == "like" else "👎 dismiss",
    }


class InviteAdmin(ModelView, model=Invite):
    column_list = [Invite.code, "invited_by_user", Invite.invited_email, Invite.status]
    column_labels = {
        "code": "Code",
        "invited_by_user": "From",
        "invited_email": "To Email",
        "status": "Status",
    }
    column_searchable_list = [Invite.code, Invite.invited_email]
    column_sortable_list = [Invite.status, Invite.created_at]
    column_default_sort = [(Invite.created_at, True)]
    page_size = 25
    name = "Invite"
    name_plural = "Invites"
    icon = "fa-solid fa-envelope"


class PreferenceAdmin(ModelView, model=UserPreference):
    column_list = ["user", UserPreference.genders, UserPreference.max_length]
    column_labels = {
        "user": "User",
        "genders": "Genders",
        "max_length": "Max Len",
    }
    page_size = 25
    name = "Preference"
    name_plural = "Preferences"
    icon = "fa-solid fa-sliders"


def setup_admin(app):
    """Initialize SQLAdmin and register all model views."""
    from starlette.responses import HTMLResponse

    # Custom login page route - must be added BEFORE SQLAdmin
    @app.get("/admin/login")
    async def admin_login_page(request: Request):
        """Show a simple login page with Google button."""
        error = request.query_params.get("error", "")
        error_html = f'<p style="color: #dc3545; margin-bottom: 20px;">{error}</p>' if error else ""

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Login - Hatch</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: #1a1d21;
                }}
                .login-box {{
                    background: #212529;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                    text-align: center;
                    max-width: 400px;
                    border: 1px solid #373b3e;
                }}
                h1 {{
                    margin: 0 0 10px 0;
                    color: #f8f9fa;
                    font-size: 24px;
                }}
                p.subtitle {{
                    color: #adb5bd;
                    margin: 0 0 30px 0;
                }}
                .google-btn {{
                    display: inline-flex;
                    align-items: center;
                    gap: 12px;
                    background: #4285f4;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 6px;
                    text-decoration: none;
                    font-size: 16px;
                    font-weight: 500;
                    transition: background 0.2s;
                }}
                .google-btn:hover {{
                    background: #3367d6;
                }}
                .google-btn svg {{
                    width: 20px;
                    height: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="login-box">
                <h1>Hatch Admin</h1>
                <p class="subtitle">Sign in to access the admin panel</p>
                {error_html}
                <a href="/admin/google-login" class="google-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
                    </svg>
                    Sign in with Google
                </a>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html)

    # Route to initiate Google OAuth
    @app.get("/admin/google-login")
    async def admin_google_login(request: Request):
        """Start Google OAuth flow for admin."""
        # Store admin intent in session before redirect
        request.session["admin_login_flow"] = True
        callback_url = f"{settings.backend_url}/api/auth/google/callback"
        return await oauth.google.authorize_redirect(request, callback_url)

    authentication_backend = AdminAuth(secret_key=settings.jwt_secret)

    admin = Admin(
        app,
        sync_engine,
        title="Hatch Admin",
        base_url="/admin",
        authentication_backend=authentication_backend,
        templates_dir="app/templates/admin",
    )

    admin.add_view(NameAdmin)
    admin.add_view(NameFactAdmin)
    admin.add_view(UserAdmin)
    admin.add_view(CoupleAdmin)
    admin.add_view(SwipeAdmin)
    admin.add_view(InviteAdmin)
    admin.add_view(PreferenceAdmin)

    return admin
