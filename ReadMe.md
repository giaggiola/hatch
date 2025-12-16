# Hatch - Baby Name App

> Swipe on baby names with your partner — match on your favorites

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   Next.js PWA   │◄───────►│   FastAPI BE    │◄───────►│     SQLite      │
│   (Frontend)    │   API   │   (Backend)     │         │   (Database)    │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │
        │                           │
   Vercel /                    Fly.io
   Fly.io                    (Docker + Volume)
```

---

## Tech Stack

- **Frontend**: Next.js 14+ (App Router)
- **Backend**: FastAPI (Python)
- **Database**: SQLite + Alembic (migrations)
- **Auth**: Google OAuth (via FastAPI + NextAuth)
- **PWA**: `next-pwa` package
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion (for swipe gestures)
- **Containerization**: Docker + Docker Compose
- **Hosting**: Fly.io (API + persistent volume for SQLite) + Vercel (Frontend)

---

## Core Features

### MVP (v1)
- [ ] **Google Sign-In** (OAuth 2.0)
- [ ] **Invite system** — generate link/code to invite partner
- [ ] Swipe interface (right = like, left = dismiss)
- [ ] Multiple name sets: Italian, English, Irish (combined pool)
- [ ] Save likes & dismisses per user
- [ ] **Match detection** — both partners liked = match!
- [ ] **Settings view**:
  - [ ] Log out
  - [ ] Delete account
  - [ ] Change family name (to preview "FirstName LastName")
- [ ] **History view**:
  - [ ] Names you liked
  - [ ] Names you dismissed
  - [ ] Matches (both liked)
  - [ ] Undo/change previous swipes
- [ ] **Filter view**:
  - [ ] Filter by origin (Italian, English, Irish — multi-select)
  - [ ] Filter by gender (Boy, Girl, Unisex)
  - [ ] Filter by starting letter(s)
  - [ ] Filter by max length
- [ ] Offline support (PWA)
- [ ] Mobile-first (primary use case)

### v2 Features
- [ ] Push notifications for new matches
- [ ] Name details (meaning, origin, popularity)
- [ ] "Maybe" pile (swipe up?)
- [ ] Export matches list
- [ ] Name pronunciation audio

---

## Database Schema (SQLite)

```sql
-- Users (from Google OAuth)
CREATE TABLE users (
    id TEXT PRIMARY KEY,                  -- UUID as text
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    family_name TEXT,                     -- for "FirstName FamilyName" preview
    avatar_url TEXT,
    couple_id TEXT REFERENCES couples(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Couples
CREATE TABLE couples (
    id TEXT PRIMARY KEY,                  -- UUID as text
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- User Preferences (filters)
CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
    origins TEXT DEFAULT '[]',            -- JSON array: ["italian", "english"]
    genders TEXT DEFAULT '[]',            -- JSON array: ["M", "F", "U"]
    starting_letters TEXT DEFAULT '[]',   -- JSON array: ["A", "B"]
    max_length INTEGER,                   -- NULL = no limit
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Invites (for partner invitations)
CREATE TABLE invites (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,            -- e.g., "BABY-7X9K"
    couple_id TEXT REFERENCES couples(id),
    invited_by TEXT REFERENCES users(id),
    invited_email TEXT,                   -- optional
    status TEXT DEFAULT 'pending',        -- pending, accepted, expired
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Names (all name sets combined)
CREATE TABLE names (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('M', 'F', 'U')),
    origin TEXT NOT NULL,                 -- 'italian', 'english', 'irish'
    meaning TEXT,
    popularity_rank INTEGER,
    length INTEGER                        -- computed on insert
);

-- Indexes for filtered queries
CREATE INDEX idx_names_origin ON names(origin);
CREATE INDEX idx_names_gender ON names(gender);
CREATE INDEX idx_names_length ON names(length);

-- Swipes (likes & dismisses)
CREATE TABLE swipes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name_id TEXT NOT NULL REFERENCES names(id),
    couple_id TEXT NOT NULL REFERENCES couples(id),
    action TEXT CHECK (action IN ('like', 'dismiss')) NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, name_id)
);

-- Indexes for fast queries
CREATE INDEX idx_swipes_couple_name ON swipes(couple_id, name_id);
CREATE INDEX idx_swipes_user_action ON swipes(user_id, action);

-- Matches view
CREATE VIEW matches AS
SELECT 
    s1.couple_id,
    s1.name_id,
    n.name,
    n.gender,
    n.origin,
    MAX(s1.created_at, s2.created_at) AS matched_at
FROM swipes s1
JOIN swipes s2 ON s1.name_id = s2.name_id 
    AND s1.couple_id = s2.couple_id 
    AND s1.user_id != s2.user_id
JOIN names n ON s1.name_id = n.id
WHERE s1.action = 'like' AND s2.action = 'like';
```

**SQLite Notes:**
- UUIDs stored as TEXT (generated in Python with `uuid.uuid4()`)
- Arrays stored as JSON strings (parsed in Python)
- Datetimes stored as TEXT in ISO format
- No `gen_random_uuid()` — generate in application code
- Use `datetime('now')` instead of `NOW()`

---

## Project Structure

```
baby-name-swiper/
├── docker-compose.yml           # Local dev: API + DB + Frontend
├── fly.toml                     # Fly.io deployment config
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/                 # DB migrations
│   │   └── versions/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings & env vars
│   │   ├── database.py          # DB connection
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── couple.py
│   │   │   ├── invite.py
│   │   │   ├── name.py
│   │   │   ├── swipe.py
│   │   │   └── preference.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── invite.py
│   │   │   ├── name.py
│   │   │   ├── swipe.py
│   │   │   └── preference.py
│   │   ├── routers/
│   │   │   ├── auth.py          # Google OAuth endpoints
│   │   │   ├── users.py         # User settings, delete account
│   │   │   ├── invites.py       # Create/accept invites
│   │   │   ├── names.py         # Get names to swipe (with filters)
│   │   │   ├── swipes.py        # Record swipes, get history
│   │   │   ├── matches.py       # Get matches
│   │   │   └── preferences.py   # Get/update filter preferences
│   │   ├── services/
│   │   │   ├── auth.py          # Google OAuth logic
│   │   │   ├── invite.py        # Invite code generation
│   │   │   └── matching.py      # Match detection
│   │   └── seed/
│   │       └── names.py         # Seed name data
│   └── tests/
│
├── frontend/
│   ├── Dockerfile
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Landing
│   │   │   ├── auth/
│   │   │   │   └── callback/page.tsx # OAuth callback
│   │   │   ├── swipe/
│   │   │   │   └── page.tsx          # Main swipe interface
│   │   │   ├── history/
│   │   │   │   ├── page.tsx          # Tabs: Likes / Dismisses / Matches
│   │   │   │   ├── likes/page.tsx
│   │   │   │   ├── dismisses/page.tsx
│   │   │   │   └── matches/page.tsx
│   │   │   ├── filters/
│   │   │   │   └── page.tsx          # Filter preferences
│   │   │   ├── invite/
│   │   │   │   ├── page.tsx          # Create invite
│   │   │   │   └── [code]/page.tsx   # Accept invite
│   │   │   └── settings/
│   │   │       └── page.tsx          # Logout, delete, family name
│   │   ├── components/
│   │   │   ├── SwipeCard.tsx
│   │   │   ├── SwipeStack.tsx
│   │   │   ├── MatchModal.tsx
│   │   │   ├── GoogleSignIn.tsx
│   │   │   ├── InviteLink.tsx
│   │   │   ├── NameList.tsx          # Reusable list for history
│   │   │   ├── NameCard.tsx          # Name in list with actions
│   │   │   ├── FilterForm.tsx        # Filter controls
│   │   │   ├── BottomNav.tsx         # Navigation tabs
│   │   │   └── ConfirmModal.tsx      # For delete account etc
│   │   └── lib/
│   │       ├── api.ts                # API client
│   │       ├── auth.ts               # Auth helpers
│   │       └── hooks/
│   │           ├── useSwipe.ts
│   │           ├── useHistory.ts
│   │           ├── useFilters.ts
│   │           └── useMatches.ts
│   ├── next.config.js
│   └── package.json
│
└── data/
    ├── italian_names.csv
    ├── english_names.csv
    └── irish_names.csv
```

---

## User Flows

### 1. Onboarding (User A - creates couple)
```
Landing → Sign in with Google → Auto-create couple → 
  → Generate invite link → Share with partner → Start swiping
```

### 2. Onboarding (User B - joins via invite)
```
Click invite link → Sign in with Google → Auto-join couple → Start swiping
```

### 3. Invite System
```
User A: Settings → "Invite Partner" → 
  → Generate link: https://app.com/invite/BABY-7X9K
  → Share via text/email/etc

User B: Opens link → Signs in with Google → Automatically joined to couple
```

### 4. Swiping
```
See name card (with family name preview) → 
  → Swipe right (like) / left (dismiss) → 
  → If partner already liked → "It's a Match!" modal
  → Else → Next card
```

### 5. Setting Filters
```
Filters tab → Select origins/genders/letters/length → Apply →
  → Returns to swipe screen with filtered names
```

### 6. Viewing History
```
History tab → Choose Likes/Dismisses/Matches tab →
  → See list of names → Tap name to change decision or view details
```

### 7. Changing a Decision
```
History → Tap name → "Change to Like" / "Change to Dismiss" / "Remove" →
  → Updated → If now both like → Creates match!
```

### 8. Account Management
```
Settings → Change family name → Saved immediately (preview updates)
Settings → Log out → Returns to landing
Settings → Delete account → Confirm modal → All data deleted → Landing
```

---

## API Endpoints (FastAPI)

### Auth
```
GET  /auth/google              → Redirect to Google OAuth
GET  /auth/google/callback     → Handle OAuth callback, return JWT
GET  /auth/me                  → Get current user info
POST /auth/logout              → Invalidate session
```

### Users / Settings
```
PATCH  /users/me               → Update user (family_name, display_name)
DELETE /users/me               → Delete account + all data
```

### Invites
```
POST /invites                  → Create invite link (returns code)
GET  /invites/{code}           → Get invite details
POST /invites/{code}/accept    → Accept invite, join couple
```

### Preferences / Filters
```
GET  /preferences              → Get user's filter preferences
PUT  /preferences              → Update filter preferences
                                  Body: { origins, genders, starting_letters, max_length }
```

### Names
```
GET  /names                    → Get next batch of names to swipe
                                  (auto-applies user's filter preferences)
                                  Query: ?limit=20
```

### Swipes / History
```
POST   /swipes                 → Record a swipe { name_id, action }
                                  Returns { match: true/false, name?: {...} }
GET    /swipes                 → Get swipe history
                                  Query: ?action=like|dismiss&limit=50&offset=0
PATCH  /swipes/{name_id}       → Change a previous swipe (undo/change)
                                  Body: { action: 'like' | 'dismiss' }
DELETE /swipes/{name_id}       → Remove swipe (name goes back to queue)
```

### Matches
```
GET  /matches                  → Get all matches for couple
                                  Query: ?limit=50&offset=0
```

---

## UI Screens

### 1. Swipe Screen (main)
```
┌─────────────────────────┐
│  ♥ Baby Names           │
├─────────────────────────┤
│                         │
│    ┌───────────────┐    │
│    │               │    │
│    │    Marco      │    │
│    │    Italian    │    │
│    │    ♂ Boy      │    │
│    │               │    │
│    │  Marco Smith  │    │  ← Preview with family name
│    └───────────────┘    │
│                         │
│    ✕           ♥        │  ← Swipe or tap buttons
│                         │
├─────────────────────────┤
│  🏠   📋   ⚙️   🔍      │  ← Bottom nav
└─────────────────────────┘
```

### 2. History Screen (tabs)
```
┌─────────────────────────┐
│  History                │
├─────────────────────────┤
│  [Likes] [Nopes] [Match]│  ← Tabs
├─────────────────────────┤
│  ♥ Marco      Italian   │
│  ♥ Sofia      Italian   │
│  ♥ Liam       Irish     │
│  ♥ Emma       English   │
│    ...                  │
│                         │
│  Tap to change decision │
├─────────────────────────┤
│  🏠   📋   ⚙️   🔍      │
└─────────────────────────┘
```

### 3. Filters Screen
```
┌─────────────────────────┐
│  Filters                │
├─────────────────────────┤
│                         │
│  Origin                 │
│  [✓] Italian            │
│  [✓] English            │
│  [ ] Irish              │
│                         │
│  Gender                 │
│  [✓] Boy   [✓] Girl     │
│  [ ] Unisex             │
│                         │
│  Starts with            │
│  [ A ][ B ][ C ]...     │
│                         │
│  Max length             │
│  [    8    ] letters    │
│                         │
│  [ Apply Filters ]      │
├─────────────────────────┤
│  🏠   📋   ⚙️   🔍      │
└─────────────────────────┘
```

### 4. Settings Screen
```
┌─────────────────────────┐
│  Settings               │
├─────────────────────────┤
│                         │
│  👤 John Doe            │
│     john@gmail.com      │
│                         │
│  Family Name            │
│  ┌─────────────────┐    │
│  │ Smith           │    │
│  └─────────────────┘    │
│                         │
│  Partner                │
│  👤 Jane Doe (linked)   │
│  [ Invite Partner ]     │
│                         │
│  ─────────────────────  │
│                         │
│  [ Log Out ]            │
│                         │
│  [ Delete Account ]     │  ← Red, with confirmation
│                         │
├─────────────────────────┤
│  🏠   📋   ⚙️   🔍      │
└─────────────────────────┘
```

---

## Google OAuth Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │     │ FastAPI  │     │  Google  │     │    DB    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │─── Click ─────►│                │                │
     │   "Sign In"    │                │                │
     │                │                │                │
     │◄── Redirect ───│                │                │
     │   to Google    │                │                │
     │                │                │                │
     │────────────────────────────────►│                │
     │            Google Login         │                │
     │◄────────────────────────────────│                │
     │         Auth code               │                │
     │                │                │                │
     │─── Callback ──►│                │                │
     │   with code    │                │                │
     │                │─── Exchange ──►│                │
     │                │    code        │                │
     │                │◄── Tokens ─────│                │
     │                │                │                │
     │                │─── Create/Get ────────────────►│
     │                │    User        │                │
     │                │◄───────────────────────────────│
     │                │                │                │
     │◄── JWT Token ──│                │                │
     │    + Redirect  │                │                │
     │                │                │                │
```

---

## Name Sets Data

| Set | Source | ~Count |
|-----|--------|--------|
| Italian | genderNamesITA (GitHub) | 250+ |
| English | US SSA / UK ONS | 250+ |
| Irish | Irish gov data / behindthename | 200+ |

All combined into single `names` table with `origin` field.

---

## Docker Setup

### docker-compose.yml (local dev)
```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: sqlite:///./data/baby_names.db
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: http://localhost:3000
    volumes:
      - ./backend/data:/app/data    # Persist SQLite DB

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    depends_on:
      - api
```

### Backend Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Fly.io Deployment

### fly.toml (backend)
```toml
app = "baby-name-swiper-api"
primary_region = "ewr"  # New Jersey

[build]
  dockerfile = "backend/Dockerfile"

[env]
  PORT = "8000"
  DATABASE_URL = "sqlite:///data/baby_names.db"

[http_service]
  internal_port = 8000
  force_https = true

[mounts]
  source = "baby_names_data"
  destination = "/app/data"
```

### Deploy commands
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app (first time)
cd backend
fly launch

# Create persistent volume for SQLite (important!)
fly volumes create baby_names_data --size 1 --region ewr

# Set secrets
fly secrets set GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=xxx JWT_SECRET=xxx FRONTEND_URL=https://your-frontend.vercel.app

# Deploy
fly deploy

# Run migrations (SSH into the app)
fly ssh console -C "alembic upgrade head"

# Seed data
fly ssh console -C "python -m app.seed.names"
```

**SQLite on Fly.io Notes:**
- Must use a persistent volume (data survives deploys)
- Single region recommended (SQLite doesn't replicate)
- Good for moderate traffic; upgrade to Postgres later if needed

---

## Implementation Plan

### Week 1: Backend Foundation
- [ ] Set up FastAPI project structure
- [ ] Configure SQLAlchemy + Alembic
- [ ] Create database models
- [ ] Implement Google OAuth
- [ ] Build invite system (create/accept)
- [ ] Seed names data

### Week 2: Core API + Frontend Setup
- [ ] Names endpoint (get unswiped names)
- [ ] Swipes endpoint (record + detect match)
- [ ] Matches endpoint
- [ ] Set up Next.js with Tailwind
- [ ] Google Sign-In button
- [ ] API client setup

### Week 3: Swipe UI
- [ ] Build swipe card component (Framer Motion)
- [ ] Swipe gestures + animations
- [ ] Match modal ("It's a match!")
- [ ] Matches list view
- [ ] Invite flow UI

### Week 4: PWA + Deploy
- [ ] PWA setup (manifest, service worker)
- [ ] Docker compose for local dev
- [ ] Deploy backend to Fly.io
- [ ] Deploy frontend to Vercel (or Fly.io)
- [ ] Testing + bug fixes

---

## Commands to Start

```bash
# Create project structure
mkdir baby-name-swiper
cd baby-name-swiper
mkdir backend frontend data

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install fastapi uvicorn sqlalchemy alembic \
    python-jose passlib httpx python-multipart aiosqlite

# Initialize alembic
alembic init alembic

# Create data directory
mkdir data

# Frontend setup
cd ../frontend
npx create-next-app@latest . --typescript --tailwind --app --src-dir
npm install framer-motion next-pwa

# Run backend locally (without Docker)
cd ../backend
uvicorn app.main:app --reload

# Run with Docker
cd ..
docker-compose up
```

---

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=sqlite:///./data/baby_names.db
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-random-secret-key
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project "Baby Name Swiper"
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:8000/auth/google/callback` (dev)
     - `https://your-api.fly.dev/auth/google/callback` (prod)
5. Copy Client ID and Client Secret to env vars

---

## Decisions Made

- **Gender**: Mixed (boys + girls together) but can filter
- **Name sets**: Combined pool (Italian + English + Irish) but can filter
- **One couple**: No multiple lists/projects needed
- **Auth**: Google OAuth only (simple, no passwords)
- **Invite**: Link-based (easier than codes to share)