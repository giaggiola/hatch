# Environment Variables

This document describes all environment variables used across the Hatch application.

---

## Overview

| Component | Config File | Example File |
|-----------|-------------|--------------|
| Root (Docker) | `.env` | `.env.example` |
| Backend | `backend/.env` | `backend/.env.example` |
| Frontend | `frontend/.env.local` | `frontend/.env.local.example` |
| Mobile | `mobile/.env` | `mobile/.env.example` |

---

## Backend Variables

Located in `backend/.env`

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./data/baby_names.db` | SQLAlchemy database connection string |
| `DEBUG` | No | `false` | Enable debug mode (enables dev login endpoint) |

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | - | OAuth 2.0 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | - | OAuth 2.0 client secret from Google Cloud Console |
| `JWT_SECRET` | Yes | - | Secret key for signing JWT tokens. Generate with: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_ALGORITHM` | No | `HS256` | Algorithm for JWT encoding |
| `JWT_EXPIRE_MINUTES` | No | `10080` (7 days) | JWT token expiration time in minutes |

### URLs

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTEND_URL` | Yes | `http://localhost:3000` | Frontend URL for CORS and OAuth redirects |
| `BACKEND_URL` | No | `http://localhost:8000` | Backend URL (used in OAuth callbacks) |

### Email (SMTP)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAIL_USERNAME` | No | - | Gmail address for sending emails |
| `MAIL_PASSWORD` | No | - | Gmail App Password (not regular password) |
| `MAIL_FROM` | No | - | From address for emails |
| `MAIL_SERVER` | No | `smtp.gmail.com` | SMTP server hostname |
| `MAIL_PORT` | No | `587` | SMTP server port |
| `MAIL_STARTTLS` | No | `true` | Use STARTTLS encryption |
| `MAIL_SSL_TLS` | No | `false` | Use SSL/TLS encryption |

### Admin

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_EMAILS` | No | - | Comma-separated list of admin email addresses. These users can access `/admin` panel |

### AI Features

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | No | - | Google Gemini API key for AI-powered name facts generation |

### Example Backend `.env`

```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./data/baby_names.db

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# JWT
JWT_SECRET=your-64-character-hex-secret-here

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# Admin
ADMIN_EMAILS=admin@example.com,another-admin@example.com

# Email (optional)
MAIL_USERNAME=your-app@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-app@gmail.com

# AI (optional)
GEMINI_API_KEY=AIzaSy...
```

---

## Frontend Variables

Located in `frontend/.env.local`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | - | Backend API URL (e.g., `http://localhost:8000`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | - | Google OAuth client ID (same as backend) |

**Note:** All frontend environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

### Example Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

---

## Mobile Variables

Located in `mobile/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | - | Backend API URL |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Yes | - | Web OAuth client ID (for Expo web) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Yes | - | iOS OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | No | - | Android OAuth client ID |

**Note:** All mobile environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.

### Example Mobile `.env`

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-ios.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-android.apps.googleusercontent.com
```

---

## Docker Compose Variables

Located in root `.env`

The root `.env` file is used by Docker Compose and passes values to containers:

| Variable | Used By | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Both | Passed to backend and frontend containers |
| `GOOGLE_CLIENT_SECRET` | Backend | Passed to backend container |
| `JWT_SECRET` | Backend | Passed to backend container (has a default for dev) |

---

## Production (Fly.io) Secrets

Secrets are set via `fly secrets set` command:

```bash
cd backend
fly secrets set \
  GOOGLE_CLIENT_ID="your-client-id" \
  GOOGLE_CLIENT_SECRET="your-client-secret" \
  JWT_SECRET="your-production-jwt-secret" \
  FRONTEND_URL="https://your-app.fly.dev" \
  ADMIN_EMAILS="admin@example.com" \
  GEMINI_API_KEY="your-api-key"
```

**View current secrets:**
```bash
fly secrets list
```

**Important:** Never commit production secrets to git!

---

## How to Obtain Values

### Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to "APIs & Services" > "Credentials"
4. Create OAuth 2.0 Client ID
5. Configure authorized redirect URIs:
   - Dev: `http://localhost:8000/api/auth/google/callback`
   - Prod: `https://your-api.fly.dev/api/auth/google/callback`

See [integrations.md](integrations.md) for detailed steps.

### JWT Secret

Generate a secure random string:

```bash
# Python
python -c "import secrets; print(secrets.token_hex(32))"

# OpenSSL
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Gmail App Password

1. Enable 2-Factor Authentication on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an app password for "Mail"
4. Use this 16-character password as `MAIL_PASSWORD`

### Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key"
3. Create or select a project
4. Copy the generated key

---

## Environment-Specific Values

| Variable | Development | Production |
|----------|-------------|------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/baby_names.db` | Same (with mounted volume) |
| `FRONTEND_URL` | `http://localhost:3000` | `https://your-app.fly.dev` |
| `BACKEND_URL` | `http://localhost:8000` | `https://your-api.fly.dev` |
| `DEBUG` | `true` (optional) | `false` |
| `JWT_SECRET` | Any random string | Strong random string |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | `https://your-api.fly.dev` |
| `EXPO_PUBLIC_API_URL` | `http://192.168.x.x:8000` (local IP) | `https://your-api.fly.dev` |

---

## Security Notes

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use different JWT secrets** for dev/prod
3. **Rotate secrets** if compromised
4. **Use App Passwords** for Gmail, not your regular password
5. **Limit admin emails** to trusted users only
6. **HTTPS only** in production (`FRONTEND_URL` must use `https://`)

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| OAuth redirect mismatch | `FRONTEND_URL` doesn't match actual URL | Update `FRONTEND_URL` and Google Console redirect URIs |
| CORS errors | `FRONTEND_URL` wrong | Ensure it matches exactly (no trailing slash) |
| JWT decode errors | `JWT_SECRET` changed or different between instances | Ensure same secret across all instances |
| Email not sending | Wrong Gmail credentials | Use App Password, enable 2FA |
| Mobile API calls fail | `EXPO_PUBLIC_API_URL` using `localhost` | Use your machine's local IP (e.g., `192.168.1.x`) |
