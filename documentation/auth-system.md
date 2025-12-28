# Authentication System

This document explains the authentication system in Hatch, covering OAuth flow, JWT tokens, and session management across web and mobile platforms.

---

## Overview

Hatch uses **Google OAuth 2.0** for authentication with **JWT tokens** for session management. The implementation differs between web and mobile to handle platform-specific security requirements.

| Platform | Auth Method | Token Storage | Token Delivery |
|----------|-------------|---------------|----------------|
| Web (PWA) | Google OAuth redirect | httpOnly Cookie | Same-origin cookie |
| Mobile | Google Sign-In SDK | SecureStore | Bearer header |
| Admin | Google OAuth redirect | Session cookie | Session middleware |

---

## Core Components

### Backend (`backend/app/`)

| File | Purpose |
|------|---------|
| `routers/auth.py` | OAuth endpoints, login/logout |
| `services/auth.py` | JWT creation/validation, user creation |
| `config.py` | JWT settings, secrets |

### Frontend (`frontend/src/`)

| File | Purpose |
|------|---------|
| `app/api/auth/session/route.ts` | Cookie management (set/get/delete) |
| `app/api/proxy/[...path]/route.ts` | API proxy (adds Bearer token from cookie) |
| `app/auth/callback/page.tsx` | OAuth callback handler |
| `lib/api.ts` | API client (uses proxy) |
| `lib/auth.ts` | Auth state helpers |

### Mobile (`mobile/`)

| File | Purpose |
|------|---------|
| `contexts/AuthContext.tsx` | Auth state, Google Sign-In |
| `lib/api.ts` | API client (Bearer token) |

---

## Web Authentication Flow

### Step-by-Step Flow

```
1. User clicks "Sign in with Google"
   └─► Browser redirects to /api/auth/google

2. Backend redirects to Google OAuth
   └─► User sees Google login page

3. User logs in with Google
   └─► Google redirects to /api/auth/google/callback?code=xxx

4. Backend exchanges code for user info
   └─► Creates/updates user in database
   └─► Generates JWT token
   └─► Redirects to /auth/callback?token=xxx

5. Frontend callback page receives token
   └─► POST /api/auth/session with token
   └─► Server sets httpOnly cookie

6. User is authenticated
   └─► All API calls go through /api/proxy/*
   └─► Proxy reads cookie, adds Bearer header
   └─► Backend validates JWT
```

### Sequence Diagram

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser │     │ Next.js  │     │ FastAPI  │     │  Google  │     │   DB     │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │─Click Login───►│                │                │                │
     │                │                │                │                │
     │◄─Redirect─────►│                │                │                │
     │  /api/auth/google               │                │                │
     │                │                │                │                │
     │─────────────────────────────────►│                │                │
     │               GET /api/auth/google                │                │
     │                │                │                │                │
     │◄────────────────────────────────│─Redirect──────►│                │
     │              Redirect to Google  │                │                │
     │                │                │                │                │
     │────────────────────────────────────────────────►│                │
     │                    User logs in                   │                │
     │◄───────────────────────────────────────────────│                │
     │           Callback with code                     │                │
     │                │                │                │                │
     │─────────────────────────────────►│                │                │
     │  /api/auth/google/callback       │                │                │
     │                │                │                │                │
     │                │                │─Exchange code──►│                │
     │                │                │◄─User info──────│                │
     │                │                │                │                │
     │                │                │───Create user──────────────────►│
     │                │                │◄───User data───────────────────│
     │                │                │                │                │
     │◄────────────────────────────────│                │                │
     │  Redirect: /auth/callback?token=xxx              │                │
     │                │                │                │                │
     │─POST /api/auth/session──────────►│                │                │
     │  { token: xxx }                 │                │                │
     │                │                │                │                │
     │◄─Set-Cookie: auth_token=xxx────│                │                │
     │                │                │                │                │
     │◄─Redirect to /swipe─────────────│                │                │
     │                │                │                │                │
```

### Why httpOnly Cookies?

The web frontend uses httpOnly cookies instead of localStorage for security:

| Storage Method | XSS Vulnerable | CSRF Vulnerable | Used By |
|----------------|----------------|-----------------|---------|
| localStorage | Yes | No | Avoid |
| httpOnly Cookie | No | Yes (mitigated) | Web |

**XSS Protection**: httpOnly cookies cannot be read by JavaScript, so malicious scripts can't steal tokens.

**CSRF Mitigation**: Using `sameSite: 'lax'` and only accepting same-origin requests via the proxy.

### The Proxy Pattern

Web API calls go through a Next.js API route that acts as a proxy:

```
Browser → /api/proxy/names → Next.js API Route → FastAPI Backend
                              ↑
                     Reads cookie, adds
                     Authorization header
```

**Benefits:**
1. Cookie is same-origin (works with Safari ITP)
2. Backend never sees browser cookies directly
3. Token is only transmitted server-to-server

---

## Mobile Authentication Flow

### Step-by-Step Flow

```
1. User taps "Sign in with Google"
   └─► Native Google Sign-In SDK presents login

2. User logs in with Google
   └─► SDK returns access token

3. App sends token to backend
   └─► POST /api/auth/google/mobile { access_token }

4. Backend verifies token with Google
   └─► Fetches user info from Google API
   └─► Creates/updates user in database
   └─► Returns JWT

5. App stores JWT
   └─► Saved in SecureStore (encrypted native storage)

6. User is authenticated
   └─► All API calls include Authorization: Bearer <jwt>
```

### Sequence Diagram

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Mobile  │     │  Google  │     │ FastAPI  │     │ Google   │     │    DB    │
│   App    │     │  SDK     │     │          │     │ API      │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │─Tap Login────►│                │                │                │
     │                │                │                │                │
     │◄──Google UI───│                │                │                │
     │                │                │                │                │
     │─User signs in─►│                │                │                │
     │                │                │                │                │
     │◄─Access token─│                │                │                │
     │                │                │                │                │
     │─POST /api/auth/google/mobile──►│                │                │
     │  { access_token }              │                │                │
     │                │                │                │                │
     │                │                │─Verify token──►│                │
     │                │                │◄─User info────│                │
     │                │                │                │                │
     │                │                │───Create user──────────────────►│
     │                │                │◄───User data───────────────────│
     │                │                │                │                │
     │◄─{ access_token: jwt }─────────│                │                │
     │                │                │                │                │
     │─Store in SecureStore           │                │                │
     │                │                │                │                │
```

### Why Bearer Tokens?

Mobile apps can't reliably use cookies:
- WebViews have separate cookie jars
- Native HTTP clients don't share browser cookies
- Cross-app cookie access is restricted

**SecureStore** provides encrypted storage:
- iOS: Keychain
- Android: Encrypted SharedPreferences

---

## JWT Token Structure

### Token Creation

```python
# backend/app/services/auth.py
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
```

### Token Payload

```json
{
  "sub": "user-uuid-here",
  "exp": 1704067200
}
```

| Field | Description |
|-------|-------------|
| `sub` | User ID (UUID) |
| `exp` | Expiration timestamp |

### Token Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `JWT_SECRET` | Required | Secret key for signing |
| `JWT_ALGORITHM` | `HS256` | Signing algorithm |
| `JWT_EXPIRE_MINUTES` | `10080` (7 days) | Token lifetime |

---

## Token Validation

### Validation Flow

```python
# backend/app/routers/auth.py
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    token = None

    # 1. Check httpOnly cookie (web)
    token = request.cookies.get("auth_token")

    # 2. Fallback to Authorization header (mobile)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 3. Decode and validate
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 4. Get user from database
    user = await get_user_by_id(db, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
```

### Token Sources (Priority Order)

1. **httpOnly Cookie** (`auth_token`) - Web clients
2. **Authorization Header** (`Bearer xxx`) - Mobile/API clients

---

## User Creation

When a user logs in for the first time:

```python
# backend/app/services/auth.py
async def get_or_create_user(db, google_id, email, display_name, avatar_url):
    # Check if user exists
    user = await db.execute(select(User).where(User.google_id == google_id))

    if user:
        # Update profile info
        return user

    # Create new user
    # 1. Create a new couple (every user starts with their own couple)
    couple = Couple()

    # 2. Create user linked to couple
    user = User(
        google_id=google_id,
        email=email,
        display_name=display_name,
        couple_id=couple.id,
    )

    # 3. Create default preferences
    preferences = UserPreference(user_id=user.id)

    return user
```

---

## Logout

### Web Logout

```typescript
// frontend/src/lib/api.ts
async logout() {
  // 1. Clear the httpOnly cookie
  await fetch('/api/auth/session', { method: 'DELETE' });

  // 2. Notify backend (optional cleanup)
  await this.request('/auth/logout', { method: 'POST' });

  // 3. Redirect to landing
  window.location.href = '/';
}
```

### Mobile Logout

```typescript
// mobile/contexts/AuthContext.tsx
const signOut = async () => {
  // 1. Call backend logout
  await api.logout();

  // 2. Clear stored token (SecureStore)
  await api.clearToken();

  // 3. Clear user state
  setUser(null);
};
```

---

## Admin Authentication

The admin panel (`/admin`) uses a separate auth flow:

```
1. User navigates to /admin
2. If not logged in, redirected to /admin/login
3. User clicks "Login with Google"
4. Backend checks if email is in ADMIN_EMAILS
5. If authorized, session is created
6. User can access admin panel
```

### Admin Session

Admin auth uses **session middleware** instead of JWT:

```python
# Store in session
request.session["admin_email"] = email
request.session["admin_name"] = user_info.get("name")
```

### Admin Access Control

```python
# Only emails in ADMIN_EMAILS can access
if email in settings.admin_email_list:
    # Allow access
else:
    # Redirect with error
```

---

## Development Login

For local development without Google OAuth:

```bash
# Enable in backend/.env
DEBUG=true
```

### Dev Login Endpoint

```
POST /api/auth/dev-login
```

Returns a JWT for a test user (`dev@test.local`).

### Mobile Dev Login

The mobile app shows a "Dev Login" button when `__DEV__` is true:

```typescript
const devSignIn = async () => {
  const response = await fetch(`${apiUrl}/api/auth/dev-login`, {
    method: 'POST',
  });
  const { access_token } = await response.json();
  await api.setToken(access_token);
};
```

---

## Rate Limiting

Auth endpoints are rate-limited to prevent brute force:

| Endpoint | Limit |
|----------|-------|
| `/api/auth/google` | 5/minute |
| `/api/auth/google/mobile` | 5/minute |

---

## Security Best Practices

### Token Security

| Practice | Implementation |
|----------|----------------|
| Secure transmission | HTTPS only in production |
| httpOnly cookies | Web tokens not accessible via JS |
| Short-lived tokens | 7-day expiry |
| Secure storage | SecureStore on mobile |

### OAuth Security

| Practice | Implementation |
|----------|----------------|
| State parameter | Managed by Authlib |
| PKCE | Used by Expo auth |
| Token verification | Backend verifies with Google API |

### Configuration Security

| Practice | Implementation |
|----------|----------------|
| Secret rotation | Change JWT_SECRET periodically |
| Environment variables | Never commit secrets |
| Separate secrets | Different secrets per environment |

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Not authenticated" on web | Cookie not set | Check callback flow, cookie settings |
| "Not authenticated" on mobile | Token not stored | Check SecureStore, API URL |
| OAuth redirect error | Mismatched redirect URI | Update Google Console settings |
| Token expired | 7-day lifetime exceeded | User must re-login |
| CORS error on auth | Wrong FRONTEND_URL | Update backend env |

### Debugging

**Web (check cookie):**
```javascript
// Won't work (httpOnly), but can check via DevTools > Application > Cookies
document.cookie
```

**Mobile (check token):**
```typescript
const token = await SecureStore.getItemAsync('auth_token');
console.log('Token exists:', !!token);
```

**Backend (decode token):**
```python
from app.services.auth import decode_access_token
payload = decode_access_token(token)
print(payload)  # {'sub': 'user-id', 'exp': 1234567890}
```

---

## Related Documentation

- [integrations.md](integrations.md) - Google OAuth setup in Cloud Console
- [environment.md](environment.md) - Auth-related environment variables
- [architecture.md](architecture.md) - System overview
