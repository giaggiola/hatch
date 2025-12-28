# Deployment

This document covers deploying Hatch to production, including Fly.io setup, CI/CD, secrets management, and operations.

---

## Overview

| Component | Platform | URL |
|-----------|----------|-----|
| Backend API | Fly.io | `https://hatch-api.fly.dev` |
| Frontend | Fly.io | `https://hatch-app.fly.dev` |
| Database | SQLite on Fly.io Volume | Persistent storage |
| CI/CD | GitHub Actions | Auto-deploy on push to main |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           FLY.IO                                 │
├─────────────────────────────┬───────────────────────────────────┤
│                             │                                    │
│   ┌─────────────────────┐   │   ┌─────────────────────┐         │
│   │   hatch-app         │   │   │   hatch-api         │         │
│   │   (Frontend)        │   │   │   (Backend)         │         │
│   │                     │   │   │                     │         │
│   │   Next.js           │◄──┼───│   FastAPI           │         │
│   │   Port 3000         │   │   │   Port 8000         │         │
│   │   512MB RAM         │   │   │   1024MB RAM        │         │
│   │                     │   │   │                     │         │
│   └─────────────────────┘   │   └──────────┬──────────┘         │
│                             │              │                     │
│                             │   ┌──────────▼──────────┐         │
│                             │   │   hatch_data        │         │
│                             │   │   (Volume)          │         │
│                             │   │   /app/data         │         │
│                             │   │   SQLite DB         │         │
│                             │   └─────────────────────┘         │
│                             │                                    │
│   Region: iad (Virginia)    │   Region: iad (Virginia)          │
└─────────────────────────────┴───────────────────────────────────┘
```

---

## First-Time Setup

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Login to Fly

```bash
fly auth login
```

### 3. Launch Backend

```bash
cd backend

# Create the app (first time only)
fly launch --name hatch-api --region iad

# Create persistent volume for SQLite
fly volumes create hatch_data --size 1 --region iad
```

### 4. Set Backend Secrets

```bash
fly secrets set \
  GOOGLE_CLIENT_ID="your-client-id" \
  GOOGLE_CLIENT_SECRET="your-client-secret" \
  JWT_SECRET="your-64-char-hex-secret" \
  ADMIN_EMAILS="admin@example.com" \
  GEMINI_API_KEY="your-gemini-key"
```

### 5. Deploy Backend

```bash
fly deploy
```

### 6. Run Migrations

```bash
fly ssh console -C "alembic upgrade head"
```

### 7. Seed Database

```bash
fly ssh console -C "python -m app.seed.import_names"
```

### 8. Launch Frontend

```bash
cd frontend

# Create the app
fly launch --name hatch-app --region iad

# Deploy
fly deploy
```

---

## Configuration Files

### Backend `fly.toml`

```toml
app = 'hatch-api'
primary_region = 'iad'

[build]

[env]
  DATABASE_URL = 'sqlite+aiosqlite:///./data/hatch.db'
  FRONTEND_URL = 'https://hatch-app.fly.dev'

[[mounts]]
  source = 'hatch_data'
  destination = '/app/data'

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = '1024mb'
  cpu_kind = 'shared'
  cpus = 1
```

**Key Settings:**
- `[[mounts]]`: Persistent volume for SQLite database
- `auto_stop_machines`: Machine sleeps when idle (cost savings)
- `auto_start_machines`: Wakes on incoming requests

### Frontend `fly.toml`

```toml
app = 'hatch-app'
primary_region = 'iad'

[build]
  [build.args]
    NEXT_PUBLIC_API_URL = "https://hatch-api.fly.dev"

[env]
  NODE_ENV = 'production'

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = '512mb'
  cpu_kind = 'shared'
  cpus = 1
```

**Key Settings:**
- `[build.args]`: Injects API URL at build time
- No volume needed (stateless)

---

## Dockerfiles

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY alembic alembic/
COPY alembic.ini .
COPY app app/

# Run migrations then start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

### Frontend Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## CI/CD with GitHub Actions

### Workflow File

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches:
      - main

jobs:
  deploy-backend:
    name: Deploy Backend
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
    name: Deploy Frontend
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

### Setup CI/CD

1. **Generate Fly API Token:**
   ```bash
   fly tokens create deploy
   ```

2. **Add to GitHub Secrets:**
   - Go to repo → Settings → Secrets → Actions
   - Add `FLY_API_TOKEN` with the token value

3. **Push to main:**
   - Commits to `main` auto-deploy both apps

---

## Secrets Management

### View Secrets

```bash
cd backend
fly secrets list
```

### Set Secrets

```bash
fly secrets set KEY=value
```

### Unset Secrets

```bash
fly secrets unset KEY
```

### Required Secrets (Backend)

| Secret | Description |
|--------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `JWT_SECRET` | Token signing key |
| `ADMIN_EMAILS` | Admin access list |
| `GEMINI_API_KEY` | AI features (optional) |

---

## Operations

### Check Status

```bash
# App status
fly status

# View logs
fly logs

# Follow logs
fly logs -f
```

### SSH Access

```bash
# Interactive shell
fly ssh console

# Run command
fly ssh console -C "alembic current"
```

### Database Operations

```bash
# Run migrations
fly ssh console -C "alembic upgrade head"

# Seed data
fly ssh console -C "python -m app.seed.import_names"

# Check database
fly ssh console -C "ls -la /app/data/"
```

### Restart App

```bash
fly apps restart hatch-api
```

### Scale App

```bash
# Scale memory
fly scale memory 1024

# Scale count
fly scale count 2

# View current scale
fly scale show
```

---

## Volume Management

### List Volumes

```bash
fly volumes list
```

### Create Volume

```bash
fly volumes create hatch_data --size 1 --region iad
```

### Extend Volume

```bash
fly volumes extend <volume-id> --size 2
```

### Backup Database

```bash
# Download via SFTP
fly sftp get /app/data/hatch.db ./backup.db

# Or interactive SFTP
fly sftp shell
> get /app/data/hatch.db ./backup.db
```

### Restore Database

```bash
# Stop machines first
fly machines list
fly machines stop <machine-id>

# Upload backup
fly sftp shell
> put ./backup.db /app/data/hatch.db

# Start machines
fly machines start <machine-id>
```

---

## Monitoring

### View Metrics

```bash
fly dashboard
```

Opens Fly.io dashboard with:
- Request metrics
- Memory usage
- CPU usage
- Error rates

### Health Check

```bash
curl https://hatch-api.fly.dev/health
```

Expected response:
```json
{"status": "healthy"}
```

### Check Logs for Errors

```bash
fly logs | grep -i error
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| App not starting | Check `fly logs` for errors |
| Database locked | Only one machine should access SQLite |
| Out of memory | Scale up: `fly scale memory 1024` |
| Deploy fails | Check Dockerfile and build logs |
| Migrations fail | SSH in and run manually |

### Machine Issues

```bash
# List machines
fly machines list

# Restart specific machine
fly machines restart <machine-id>

# Destroy and recreate
fly machines destroy <machine-id>
fly deploy
```

### Volume Issues

```bash
# Check volume is attached
fly volumes list

# If volume not mounting, check fly.toml [[mounts]] config
```

### Rollback

```bash
# List releases
fly releases

# Rollback to previous release
fly releases rollback
```

---

## Cost Optimization

### Current Setup

| Resource | Size | Est. Cost |
|----------|------|-----------|
| Backend VM | 1GB RAM | ~$5/mo |
| Frontend VM | 512MB RAM | ~$3/mo |
| Volume (1GB) | - | ~$0.15/mo |

### Cost Saving Tips

1. **Auto-stop machines**: Already configured
2. **Shared CPU**: Already using `shared` CPU
3. **Single region**: Already single-region
4. **Small volumes**: SQLite doesn't need much

---

## Production Checklist

### Pre-Deploy

- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] Database migrations reviewed
- [ ] Secrets set in Fly.io

### Post-Deploy

- [ ] Health check passing
- [ ] Login flow working
- [ ] Database migrations ran
- [ ] No errors in logs

### Regular Maintenance

- [ ] Weekly: Check logs for errors
- [ ] Monthly: Download database backup
- [ ] Quarterly: Review secrets/rotate keys

---

## Related Documentation

- [environment.md](environment.md) - Environment variables
- [database.md](database.md) - Database management
- [local-development.md](local-development.md) - Local setup
- [integrations.md](integrations.md) - External service setup
