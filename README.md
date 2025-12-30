# Hatch - Baby Name App

> Swipe on baby names with your partner — match on your favorites

## What is Hatch?

Hatch is a Tinder-style app for baby names. You and your partner independently swipe through names, and when you both like the same name — it's a match!

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, Tailwind CSS, React Query |
| **Mobile** | Expo (React Native), expo-router |
| **Backend** | FastAPI (Python), SQLAlchemy |
| **Database** | SQLite |
| **Auth** | Google OAuth |
| **Hosting** | Fly.io |

## Quick Start

```bash
# Clone the repo
git clone <repo-url>
cd hatch

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seed.import_names
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Access
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

See [documentation/local-development.md](documentation/local-development.md) for detailed setup.

## Project Structure

```
hatch/
├── backend/          # FastAPI backend
├── frontend/         # Next.js web app
├── mobile/           # Expo (React Native) app
├── data/             # Name datasets
└── documentation/    # Detailed docs
```

## Documentation

| Document | Description |
|----------|-------------|
| [Local Development](documentation/local-development.md) | Setup guide for all platforms |
| [Environment Variables](documentation/environment.md) | All configuration options |
| [Architecture](documentation/architecture.md) | System design and data flow |
| [Auth System](documentation/auth-system.md) | OAuth, JWT, session management |
| [Database](documentation/database.md) | Schema, models, migrations |
| [Deployment](documentation/deployment.md) | Fly.io, CI/CD, operations |
| [Mobile App](documentation/mobile.md) | React Native/Expo development |
| [Integrations](documentation/integrations.md) | Google OAuth, Gmail, Gemini setup |
| [API Reference](documentation/api-reference.md) | Complete endpoint documentation |

## Features

- Swipe interface with gesture animations
- Google Sign-In (web + mobile)
- Partner invite system with QR codes
- Match detection when both partners like a name
- Filter by gender, origin, starting letter, length
- Name details with etymology and famous people
- Similar name suggestions
- Offline-capable PWA
- Admin panel

## Links

| Environment | URL |
|-------------|-----|
| Production Frontend | https://hatch-app.fly.dev |
| Production API | https://hatch-api.fly.dev |
| API Documentation | https://hatch-api.fly.dev/docs |

## License

Private project.
