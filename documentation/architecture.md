# Architecture

This document describes the system architecture of Hatch, including how components communicate and data flows through the system.

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────┬─────────────────────────────┬─────────────────────────────┤
│   Next.js PWA   │       React Native          │         Admin Panel         │
│   (Web/Mobile   │       (iOS/Android)         │         (SQLAdmin)          │
│    Browsers)    │                             │                             │
└────────┬────────┴──────────────┬──────────────┴──────────────┬──────────────┘
         │                       │                              │
         │ httpOnly Cookie       │ Bearer Token                 │ Cookie
         │ (via proxy)           │ (SecureStore)                │ (session)
         │                       │                              │
         └───────────────────────┼──────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI BACKEND                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Auth     │  │   Names     │  │   Swipes    │  │   Admin     │        │
│  │   Router    │  │   Router    │  │   Router    │  │   Panel     │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                                   │                                          │
│                          ┌────────▼────────┐                                 │
│                          │   SQLAlchemy    │                                 │
│                          │   (async ORM)   │                                 │
│                          └────────┬────────┘                                 │
└───────────────────────────────────┼──────────────────────────────────────────┘
                                    │
                                    ▼
                           ┌────────────────┐
                           │     SQLite     │
                           │   (Persistent  │
                           │     Volume)    │
                           └────────────────┘
```

---

## Components

### Frontend (Next.js PWA)

| Aspect | Details |
|--------|---------|
| **Framework** | Next.js 14 (App Router) |
| **Location** | `frontend/` |
| **Port** | 3000 (dev), 3000 (prod) |
| **Styling** | Tailwind CSS |
| **State** | React Query (@tanstack/react-query) |
| **Animations** | Framer Motion |
| **PWA** | next-pwa package |

**Key Files:**
- `src/app/` - Route pages
- `src/components/` - Reusable components
- `src/lib/api.ts` - API client
- `src/lib/query.tsx` - React Query config

### Mobile (React Native/Expo)

| Aspect | Details |
|--------|---------|
| **Framework** | Expo SDK 54, React Native 0.81 |
| **Location** | `mobile/` |
| **Router** | expo-router (file-based) |
| **Auth** | @react-native-google-signin/google-signin |
| **Storage** | expo-secure-store |
| **State** | React Query |

**Key Files:**
- `app/` - Route pages (tabs, modals)
- `components/` - Reusable components
- `lib/api.ts` - API client
- `contexts/AuthContext.tsx` - Auth state

### Backend (FastAPI)

| Aspect | Details |
|--------|---------|
| **Framework** | FastAPI 0.109 |
| **Location** | `backend/` |
| **Port** | 8000 |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Migrations** | Alembic |
| **Auth** | Google OAuth + JWT |

**Directory Structure:**
```
backend/
├── app/
│   ├── main.py           # App entry, middleware
│   ├── config.py         # Settings (from env)
│   ├── database.py       # DB connection
│   ├── admin.py          # SQLAdmin setup
│   ├── rate_limiter.py   # SlowAPI config
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── routers/          # API endpoints
│   └── services/         # Business logic
├── alembic/              # Migrations
└── data/                 # SQLite database
```

### Database (SQLite)

| Aspect | Details |
|--------|---------|
| **Engine** | SQLite via aiosqlite |
| **Location** | `backend/data/hatch.db` |
| **Persistence** | Fly.io volume mount |

See [database.md](database.md) for schema details.

---

## Data Flow

### 1. Web Authentication Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Browser │      │ Next.js  │      │ FastAPI  │      │  Google  │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │──Click Login───►│                 │                 │
     │                 │                 │                 │
     │◄─Redirect to────│                 │                 │
     │  /api/auth/google                 │                 │
     │                 │                 │                 │
     │─────────────────────────────────►│                 │
     │               GET /api/auth/google                  │
     │                 │                 │                 │
     │◄────────────────────────────────│──Redirect to────►│
     │              Redirect to Google                     │
     │                 │                 │                 │
     │──User logs in with Google────────────────────────►│
     │                 │                 │                 │
     │◄─────────────────────────────────────────Callback──│
     │   /api/auth/google/callback?code=xxx               │
     │                 │                 │                 │
     │─────────────────────────────────►│                 │
     │                 │                 │──Exchange code─►│
     │                 │                 │                 │
     │                 │                 │◄─User info──────│
     │                 │                 │                 │
     │                 │                 │─Create/get user─│
     │                 │                 │                 │
     │◄────Set httpOnly cookie + redirect to /swipe───────│
     │                 │                 │                 │
```

### 2. Mobile Authentication Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Mobile  │      │  Google  │      │ FastAPI  │      │  Secure  │
│   App    │      │  Sign-In │      │          │      │  Store   │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │──Tap Login────►│                 │                 │
     │  (Native SDK)   │                 │                 │
     │                 │                 │                 │
     │◄─Google auth────│                 │                 │
     │   popup/sheet   │                 │                 │
     │                 │                 │                 │
     │──User signs in─►│                 │                 │
     │                 │                 │                 │
     │◄─ID Token───────│                 │                 │
     │                 │                 │                 │
     │─────────POST /api/auth/google/mobile──────────────►│
     │                 │     { access_token }              │
     │                 │                 │                 │
     │                 │                 │─Verify token────│
     │                 │                 │                 │
     │◄──────────────{ access_token: "jwt..." }───────────│
     │                 │                 │                 │
     │─────────────────────────────────────────Store token►│
     │                 │                 │                 │
```

### 3. API Request Flow (Web)

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Browser │      │ Next.js  │      │ FastAPI  │      │  SQLite  │
│   (SPA)  │      │  Proxy   │      │          │      │          │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │─GET /api/proxy/names─────────────────────────────►│
     │   (same-origin, sends cookie)                      │
     │                 │                 │                 │
     │                 │─Forward + add───►│                │
     │                 │  Authorization   │                │
     │                 │                 │                 │
     │                 │                 │─Verify JWT──────│
     │                 │                 │                 │
     │                 │                 │─Query DB────────►│
     │                 │                 │                 │
     │                 │                 │◄─Names data─────│
     │                 │                 │                 │
     │◄───────────────────{ names: [...] }────────────────│
     │                 │                 │                 │
```

### 4. API Request Flow (Mobile)

```
┌──────────┐                          ┌──────────┐      ┌──────────┐
│  Mobile  │                          │ FastAPI  │      │  SQLite  │
│   App    │                          │          │      │          │
└────┬─────┘                          └────┬─────┘      └────┬─────┘
     │                                     │                 │
     │─GET /api/names────────────────────►│                 │
     │  Authorization: Bearer <jwt>        │                 │
     │                                     │                 │
     │                                     │─Verify JWT──────│
     │                                     │                 │
     │                                     │─Query DB────────►│
     │                                     │                 │
     │                                     │◄─Names data─────│
     │                                     │                 │
     │◄──────────────{ names: [...] }──────│                 │
     │                                     │                 │
```

---

## API Structure

### Router Organization

| Router | Prefix | Purpose |
|--------|--------|---------|
| `auth` | `/api/auth` | OAuth, login, logout, session |
| `users` | `/api/users` | Profile, settings, partner |
| `invites` | `/api/invites` | Couple invitations |
| `names` | `/api/names` | Name data, search, explore |
| `swipes` | `/api/swipes` | Record likes/dismisses |
| `matches` | `/api/matches` | Matched names |
| `preferences` | `/api/preferences` | Filter preferences |
| `custom_names` | `/api/custom-names` | User-added names |

### Middleware Stack

Note: FastAPI/Starlette processes middleware in LIFO order (last added → first to process).

```
Request
    │
    ▼
┌───────────────────────────┐
│   CORSMiddleware          │  ← Cross-origin requests (added last, runs first)
└────────────┬──────────────┘
             ▼
┌───────────────────────────┐
│   SessionMiddleware       │  ← OAuth state storage
└────────────┬──────────────┘
             ▼
┌───────────────────────────┐
│   ProxyHeadersMiddleware  │  ← Handle X-Forwarded-* headers
└────────────┬──────────────┘
             ▼
┌───────────────────────────┐
│   Route Handler           │  ← @limiter.limit() decorators for rate limiting
└───────────────────────────┘
```

---

## Authentication Mechanisms

### Web (httpOnly Cookie)

The web frontend uses **same-origin proxy** pattern:

1. Frontend makes requests to `/api/proxy/*` (same origin)
2. Next.js API route proxies to FastAPI backend
3. JWT stored in httpOnly cookie (secure, not accessible via JS)
4. Cookie sent automatically with same-origin requests

**Why:** Prevents XSS attacks from stealing tokens.

### Mobile (Bearer Token)

The mobile app uses **Authorization header**:

1. After Google Sign-In, app receives JWT from backend
2. JWT stored in `expo-secure-store` (encrypted native storage)
3. Each request includes `Authorization: Bearer <jwt>` header

**Why:** Mobile apps can't use cookies reliably across WebViews/native.

---

## Caching Strategy

### React Query (Client-Side)

| Data Type | Stale Time | GC Time |
|-----------|------------|---------|
| Static (countries, origins) | 1 hour | 2 hours |
| Semi-static (search, name details) | 5 min | 30 min |
| User data (preferences, swipes, matches) | 2 min | 10 min |
| Dynamic (current user, partner) | 30 sec | 5 min |

### HTTP Caching (Backend)

```
Cache-Control: public, max-age=3600   # Static data (countries, origins, popular names)
Cache-Control: public, max-age=300    # Semi-static data (search results)
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLY.IO                                   │
├─────────────────────────────┬───────────────────────────────────┤
│                             │                                    │
│   ┌─────────────────────┐   │   ┌─────────────────────┐        │
│   │   hatch-app         │   │   │   hatch-api         │        │
│   │   (Frontend)        │   │   │   (Backend)         │        │
│   │                     │   │   │                     │        │
│   │   Next.js           │◄──┼───│   FastAPI           │        │
│   │   Port 3000         │   │   │   Port 8000         │        │
│   │                     │   │   │                     │        │
│   └─────────────────────┘   │   └──────────┬──────────┘        │
│                             │              │                    │
│                             │   ┌──────────▼──────────┐        │
│                             │   │   Persistent Vol    │        │
│                             │   │   /app/data         │        │
│                             │   │   (SQLite DB)       │        │
│                             │   └─────────────────────┘        │
│                             │                                   │
└─────────────────────────────┴───────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│   GitHub Actions (CI/CD)                                         │
│   - Push to main → Deploy backend & frontend (parallel)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Authentication

- **OAuth 2.0** with Google (no passwords stored)
- **JWT tokens** with HS256 signing
- **7-day expiry** (configurable)
- **httpOnly cookies** for web (XSS protection)
- **SecureStore** for mobile (encrypted storage)

### Authorization

- Users can only access their own data
- Couple data shared between paired users
- Admin panel restricted to `ADMIN_EMAILS`

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Auth endpoints | 10/minute |
| API endpoints | 100/minute |
| Name search | 30/minute |
| Swipe endpoints | 60/minute |
| Invite creation | 5/minute |

### Data Protection

- CORS restricted to `FRONTEND_URL`
- HTTPS enforced in production
- No sensitive data in URLs (use POST bodies)
- SQLite in persistent volume (survives restarts)

---

## Technology Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | SQLite | Simple, no server needed, good for moderate traffic |
| **Auth** | Google OAuth | No password management, familiar UX |
| **Frontend** | Next.js | SSR, PWA support, great DX |
| **Mobile** | Expo | Cross-platform, OTA updates, easy setup |
| **Backend** | FastAPI | Async, auto-docs, type-safe |
| **Hosting** | Fly.io | SQLite-friendly (volumes), edge deployment |
| **State** | React Query | Caching, deduplication, background refetch |

---

## Scaling Considerations

### Current Limits (SQLite)

- Single-region deployment
- Sequential writes (one writer at a time)
- Good for 100s of concurrent users

### Future Scaling Path

1. **Read Replicas**: Use LiteFS for read replicas
2. **PostgreSQL**: Migrate when traffic demands
3. **Multi-region**: Add regions after Postgres migration
4. **CDN**: Static assets via Fly's built-in CDN

---

## Related Documentation

- [auth-system.md](auth-system.md) - Authentication deep dive
- [database.md](database.md) - Schema and models
- [deployment.md](deployment.md) - Deployment details
- [api-reference.md](api-reference.md) - Full API documentation
