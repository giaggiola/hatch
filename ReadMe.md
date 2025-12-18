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
- **Data Fetching**: React Query (@tanstack/react-query)
- **QR Codes**: qrcode.react (for invite sharing)
- **Containerization**: Docker + Docker Compose
- **Hosting**: Fly.io (API + Frontend, persistent volume for SQLite)
- **Admin Panel**: SQLAdmin (at `/admin` endpoint)
- **Rate Limiting**: SlowAPI
- **Email**: FastAPI-Mail (Gmail SMTP)
- **CI/CD**: GitHub Actions (auto-deploy on push to main)

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
    meaning TEXT,
    length INTEGER,                       -- computed on insert
    embedding BLOB                        -- vector embedding for similarity
);

-- Indexes for filtered queries
CREATE INDEX idx_names_gender ON names(gender);
CREATE INDEX idx_names_length ON names(length);

-- Name Popularity (per country)
CREATE TABLE name_popularity (
    id TEXT PRIMARY KEY,
    name_id TEXT NOT NULL REFERENCES names(id),
    country_code TEXT NOT NULL,           -- 'US', 'IT', 'IE', etc.
    popularity_rank INTEGER,
    weighted_count REAL,
    UNIQUE(name_id, country_code)
);

CREATE INDEX idx_name_popularity_country ON name_popularity(country_code);
CREATE INDEX idx_name_popularity_rank ON name_popularity(popularity_rank);

-- Name Facts (meaning, etymology, etc.)
CREATE TABLE name_fact (
    id TEXT PRIMARY KEY,
    name_id TEXT UNIQUE NOT NULL REFERENCES names(id),
    pronunciation TEXT,
    etymology TEXT,
    historical_figures TEXT,              -- JSON array
    fictional_characters TEXT,            -- JSON array
    cultural_references TEXT,             -- JSON array
    embedding BLOB                        -- fact embedding for similarity
);

-- Name Similarity (pre-computed similar names)
CREATE TABLE name_similarity (
    id TEXT PRIMARY KEY,
    name_id TEXT NOT NULL REFERENCES names(id),
    similar_name_id TEXT NOT NULL REFERENCES names(id),
    similarity_score REAL NOT NULL,
    rank INTEGER NOT NULL,                -- 1-20 for top similar names
    UNIQUE(name_id, similar_name_id)
);

CREATE INDEX idx_name_similarity_name ON name_similarity(name_id);
CREATE INDEX idx_name_similarity_rank ON name_similarity(rank);

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
hatch/
├── docker-compose.yml           # Local dev: API + Frontend
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD: auto-deploy to Fly.io
│
├── backend/
│   ├── Dockerfile
│   ├── fly.toml                 # Fly.io backend config
│   ├── requirements.txt
│   ├── alembic/                 # DB migrations
│   │   └── versions/            # 14+ migration files
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings & env vars
│   │   ├── database.py          # Async DB connection
│   │   ├── admin.py             # SQLAdmin panel setup
│   │   ├── rate_limiter.py      # API rate limiting
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── couple.py
│   │   │   ├── invite.py
│   │   │   ├── name.py
│   │   │   ├── name_popularity.py
│   │   │   ├── name_fact.py
│   │   │   ├── name_similarity.py
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
│   │   │   ├── names.py         # Names + explore + similarity
│   │   │   ├── swipes.py        # Record swipes, batch ops
│   │   │   ├── matches.py       # Get matches
│   │   │   └── preferences.py   # Get/update filter preferences
│   │   ├── services/
│   │   │   ├── auth.py          # Google OAuth logic
│   │   │   ├── invite.py        # Invite code generation
│   │   │   ├── matching.py      # Match detection
│   │   │   ├── similarity.py    # Name similarity engine
│   │   │   ├── name_service.py  # Origin/country mapping
│   │   │   └── email.py         # Email notifications
│   │   └── seed/
│   │       ├── import_names.py  # Import from CSV
│   │       └── compute_similarities.py
│   └── data/                    # SQLite database storage
│
├── frontend/
│   ├── Dockerfile
│   ├── fly.toml                 # Fly.io frontend config
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
│   │   │   │   └── page.tsx          # Likes / Dismisses / Matches
│   │   │   ├── explore/
│   │   │   │   ├── page.tsx          # Browse by region
│   │   │   │   └── [origin]/page.tsx # Names by origin
│   │   │   ├── popular/
│   │   │   │   └── page.tsx          # Popular names
│   │   │   ├── name/
│   │   │   │   └── [id]/page.tsx     # Name details
│   │   │   ├── invite/
│   │   │   │   └── [code]/page.tsx   # Accept invite
│   │   │   └── settings/
│   │   │       └── page.tsx          # Profile, filters, logout
│   │   ├── components/
│   │   │   ├── SwipeCardWithSimilar.tsx  # Swipe card + variants
│   │   │   ├── MatchModal.tsx
│   │   │   ├── GoogleSignIn.tsx
│   │   │   ├── InviteShareModal.tsx
│   │   │   ├── InviteQRCode.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── AppShell.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── SearchAutocomplete.tsx
│   │   │   ├── LikeButton.tsx
│   │   │   ├── explore/
│   │   │   │   ├── PopularNames.tsx
│   │   │   │   └── RegionAccordion.tsx
│   │   │   └── settings/
│   │   │       ├── ProfileSection.tsx
│   │   │       ├── FiltersSection.tsx
│   │   │       ├── AppearanceSection.tsx
│   │   │       └── DeleteAccountModal.tsx
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx      # Light/dark mode
│   │   ├── hooks/
│   │   │   └── useSwipeState.ts
│   │   └── lib/
│   │       ├── api.ts                # API client
│   │       ├── auth.ts               # Auth helpers
│   │       ├── query.tsx             # React Query setup
│   │       ├── constants.ts
│   │       ├── regions.ts
│   │       └── countries.ts
│   ├── next.config.js
│   └── package.json
│
└── data/
    ├── raw/                     # Original name datasets
    └── merged/
        ├── merged_names.csv
        ├── merged_name_popularity.csv
        └── merge_names.py
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
GET  /api/auth/google              → Redirect to Google OAuth
GET  /api/auth/google/callback     → Handle OAuth callback, set httpOnly cookie
GET  /api/auth/me                  → Get current user info
POST /api/auth/logout              → Clear session cookie
```

### Users / Settings
```
PATCH  /api/users/me               → Update user (family_name, display_name)
DELETE /api/users/me               → Delete account + all data
GET    /api/users/partner          → Get partner info (if in couple)
```

### Invites
```
POST /api/invites                  → Create invite link (returns code)
GET  /api/invites                  → List user's invites
GET  /api/invites/{code}           → Get invite details
POST /api/invites/{code}/accept    → Accept invite, join couple
```

### Preferences / Filters
```
GET  /api/preferences              → Get user's filter preferences
PUT  /api/preferences              → Update filter preferences
                                      Body: { origins, genders, starting_letters, max_length }
```

### Names
```
GET  /api/names                    → Get next batch of names to swipe
                                      (auto-applies user's filter preferences)
                                      Query: ?limit=20
GET  /api/names/{id}               → Get name details (facts, popularity)
GET  /api/names/{id}/similar       → Get similar name variants
GET  /api/names/explore            → Browse names by origin/popularity
                                      Query: ?origin=italian&gender=M&limit=50
GET  /api/names/popular            → Get popular names by country
                                      Query: ?country=US&limit=50
GET  /api/names/search             → Search names by prefix
                                      Query: ?q=Mar&limit=10
```

### Swipes / History
```
POST   /api/swipes                 → Record a swipe { name_id, action }
                                      Returns { match: true/false, name?: {...} }
POST   /api/swipes/batch           → Batch swipe multiple names
                                      Body: { name_ids: [...], action }
GET    /api/swipes                 → Get swipe history
                                      Query: ?action=like|dismiss&limit=50&offset=0
PATCH  /api/swipes/{name_id}       → Change a previous swipe (undo/change)
                                      Body: { action: 'like' | 'dismiss' }
DELETE /api/swipes/{name_id}       → Remove swipe (name goes back to queue)
```

### Matches
```
GET  /api/matches                  → Get all matches for couple
                                      Query: ?limit=50&offset=0
```

### Admin & Health
```
GET  /health                       → Health check
GET  /admin                        → SQLAdmin panel (admin users only)
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
      DATABASE_URL: sqlite+aiosqlite:///./data/hatch.db
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

### fly.toml (backend - in backend/ directory)
```toml
app = "hatch-api"
primary_region = "iad"  # Virginia

[build]

[env]
  DATABASE_URL = "sqlite+aiosqlite:///./data/hatch.db"

[[mounts]]
  source = "hatch_data"
  destination = "/app/data"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

### fly.toml (frontend - in frontend/ directory)
```toml
app = "hatch-app"
primary_region = "iad"

[build]

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

### Deploy commands
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch backend (first time, from backend/ directory)
cd backend
fly launch

# Create persistent volume for SQLite (important!)
fly volumes create hatch_data --size 1 --region iad

# Set secrets
fly secrets set GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=xxx JWT_SECRET=xxx FRONTEND_URL=https://hatch-app.fly.dev

# Deploy backend
fly deploy

# Launch frontend (from frontend/ directory)
cd ../frontend
fly launch
fly deploy

# Run migrations (SSH into the backend)
cd ../backend
fly ssh console -C "alembic upgrade head"

# Seed data
fly ssh console -C "python -m app.seed.import_names"
```

### CI/CD (GitHub Actions)

The project includes automatic deployment on push to main. See `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches:
      - main

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-action/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-action/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Setup:** Add `FLY_API_TOKEN` to your GitHub repository secrets (get it from `fly tokens create deploy`).

**SQLite on Fly.io Notes:**
- Must use a persistent volume (data survives deploys)
- Single region recommended (SQLite doesn't replicate)
- Good for moderate traffic; upgrade to Postgres later if needed

---

## Implementation Plan

### Phase 1: Backend Foundation
- [x] Set up FastAPI project structure
- [x] Configure SQLAlchemy + Alembic (async)
- [x] Create database models
- [x] Implement Google OAuth
- [x] Build invite system (create/accept)
- [x] Seed names data

### Phase 2: Core API + Frontend Setup
- [x] Names endpoint (get unswiped names)
- [x] Swipes endpoint (record + detect match)
- [x] Matches endpoint
- [x] Set up Next.js with Tailwind
- [x] Google Sign-In button
- [x] API client setup (React Query)

### Phase 3: Swipe UI
- [x] Build swipe card component (Framer Motion)
- [x] Swipe gestures + animations
- [x] Match modal ("It's a match!")
- [x] Matches list view
- [x] Invite flow UI (with QR code)

### Phase 4: PWA + Deploy
- [x] PWA setup (manifest, service worker)
- [x] Docker compose for local dev
- [x] Deploy backend to Fly.io
- [x] Deploy frontend to Fly.io
- [x] CI/CD with GitHub Actions

### Phase 5: Advanced Features (In Progress)
- [x] Admin panel (SQLAdmin)
- [x] Rate limiting
- [x] Name popularity data
- [x] Name facts (etymology, etc.)
- [ ] Name similarity engine
- [ ] Email notifications

---

## Commands to Start

```bash
# Clone and setup
git clone <repo-url> hatch
cd hatch

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Seed name data
python -m app.seed.import_names

# Run backend locally
uvicorn app.main:app --reload

# Frontend setup (in new terminal)
cd frontend
npm install

# Run frontend locally
npm run dev

# Or run both with Docker
cd ..
docker-compose up
```

---

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=sqlite+aiosqlite:///./data/hatch.db
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-random-secret-key
FRONTEND_URL=http://localhost:3000
ADMIN_EMAILS=admin@example.com
# Optional: Email notifications
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-gmail@gmail.com
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project "Hatch"
3. Enable Google+ API (or Google Identity)
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:8000/api/auth/google/callback` (dev)
     - `https://hatch-api.fly.dev/api/auth/google/callback` (prod)
5. Copy Client ID and Client Secret to env vars

---

## Decisions Made

- **Gender**: Mixed (boys + girls together) but can filter
- **Name sets**: Combined pool (Italian + English + Irish) but can filter
- **One couple**: No multiple lists/projects needed
- **Auth**: Google OAuth only (simple, no passwords)
- **Invite**: Link-based (easier than codes to share)