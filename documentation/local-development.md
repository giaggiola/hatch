# Local Development Guide

This guide will help you set up the Hatch development environment on your local machine.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend runtime |
| npm | 9+ | Package manager |
| Git | Latest | Version control |
| Docker | Latest | Optional: containerized dev |

**For mobile development:**
| Tool | Version | Purpose |
|------|---------|---------|
| Xcode | 15+ | iOS builds (macOS only) |
| CocoaPods | Latest | iOS dependencies |
| Android Studio | Latest | Android builds |

---

## Quick Start

### Option 1: Docker (Recommended for quick setup)

```bash
# Clone the repository
git clone <repo-url> hatch
cd hatch

# Copy environment files
cp .env.example .env
# Edit .env with your Google OAuth credentials (see integrations.md)

# Start everything
docker-compose up

# Access:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

### Option 2: Manual Setup

Follow the detailed steps below for each component.

---

## Backend Setup

### 1. Create Virtual Environment

```bash
cd backend

# Create venv
python -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values:
# - GOOGLE_CLIENT_ID (from Google Cloud Console)
# - GOOGLE_CLIENT_SECRET (from Google Cloud Console)
# - JWT_SECRET (generate a random string)
```

**Generate a JWT secret:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Initialize Database

```bash
# Run migrations
alembic upgrade head

# Seed name data
python -m app.seed.import_names
```

### 5. Start Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

**Verify it's running:**
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.local.example .env.local

# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### 3. Start Development Server

```bash
npm run dev
```

**Access:** http://localhost:3000

---

## Mobile Setup (Expo/React Native)

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. iOS Setup (macOS only)

```bash
# Install CocoaPods dependencies
cd ios
pod install
cd ..
```

### 3. Configure Google Sign-In

The mobile app uses native Google Sign-In. You'll need:
- iOS Client ID (from Google Cloud Console)
- Update `mobile/app.json` with your client IDs

See [integrations.md](integrations.md) for detailed setup.

### 4. Start Development

```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

**Note:** For native modules (Google Sign-In), you need a development build:
```bash
npx expo prebuild
npx expo run:ios  # or run:android
```

---

## Running All Services Together

For full-stack development, run these in separate terminals:

| Terminal | Directory | Command |
|----------|-----------|---------|
| 1 | `backend/` | `source venv/bin/activate && uvicorn app.main:app --reload` |
| 2 | `frontend/` | `npm run dev` |
| 3 | `mobile/` | `npx expo start` |

---

## Development Workflows

### Database Migrations

```bash
cd backend
source venv/bin/activate

# Create a new migration after model changes
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

### Adding New Dependencies

**Backend:**
```bash
pip install package-name
pip freeze > requirements.txt
```

**Frontend:**
```bash
npm install package-name
```

**Mobile:**
```bash
npx expo install package-name  # Preferred for Expo compatibility
# or
npm install package-name
```

### Code Quality

**Frontend linting:**
```bash
cd frontend
npm run lint
```

**Type checking:**
```bash
cd frontend
npx tsc --noEmit
```

---

## Common Issues & Solutions

### Backend Issues

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError` | Ensure venv is activated: `source venv/bin/activate` |
| Database locked | Close SQLite browser/other connections |
| Port 8000 in use | Kill process: `lsof -i :8000` then `kill <PID>` |
| Migration conflicts | `alembic stamp head` then retry |

### Frontend Issues

| Issue | Solution |
|-------|----------|
| `ENOENT` errors | Delete `node_modules` and `npm install` |
| Port 3000 in use | Kill process or use `npm run dev -- -p 3001` |
| API connection failed | Ensure backend is running on port 8000 |
| OAuth redirect error | Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` matches backend |

### Mobile Issues

| Issue | Solution |
|-------|----------|
| Pod install fails | `cd ios && pod repo update && pod install` |
| Google Sign-In not working | Rebuild: `npx expo prebuild --clean && npx expo run:ios` |
| Metro bundler stuck | Clear cache: `npx expo start --clear` |
| iOS build fails | Open in Xcode and check signing settings |

### General Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Backend `FRONTEND_URL` must match your frontend URL |
| OAuth callback fails | Ensure redirect URIs are configured in Google Console |
| Changes not reflecting | Hard refresh (Cmd+Shift+R) or clear browser cache |

---

## Environment Files Summary

| File | Location | Purpose |
|------|----------|---------|
| `.env` | Root | Docker compose variables |
| `.env` | `backend/` | Backend configuration |
| `.env.local` | `frontend/` | Frontend configuration |
| `app.json` | `mobile/` | Expo/mobile configuration |

See [environment.md](environment.md) for detailed variable descriptions.

---

## Useful Commands Reference

```bash
# Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload              # Start server
alembic upgrade head                        # Run migrations
python -m app.seed.import_names            # Seed database
python -c "from app.database import ..."   # Test imports

# Frontend
cd frontend
npm run dev                                 # Start dev server
npm run build                               # Production build
npm run lint                                # Run linter

# Mobile
cd mobile
npx expo start                              # Start Expo
npx expo run:ios                            # Run on iOS
npx expo run:android                        # Run on Android
npx expo prebuild --clean                   # Clean rebuild

# Docker
docker-compose up                           # Start all services
docker-compose down                         # Stop all services
docker-compose build --no-cache             # Rebuild images
docker-compose logs -f api                  # Follow API logs
```

---

## Next Steps

- [environment.md](environment.md) - Understand all configuration options
- [architecture.md](architecture.md) - Learn how components connect
- [auth-system.md](auth-system.md) - Understand authentication flow
- [integrations.md](integrations.md) - Set up Google OAuth and other services
