# Integrations

This document covers setting up external services and third-party integrations used by Hatch.

---

## Overview

| Service | Purpose | Required |
|---------|---------|----------|
| Google OAuth | User authentication | Yes |
| Gmail SMTP | Email notifications | Optional |
| Google Gemini | AI name facts (pre-computed) | Optional |

---

## Google OAuth Setup

Google OAuth is required for user authentication across web and mobile platforms.

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name: `Hatch` (or your preferred name)
4. Click **Create**

### 2. Enable APIs

1. Navigate to **APIs & Services** → **Library**
2. Search for and enable:
   - **Google+ API** (or Google Identity)
   - **Google People API** (optional, for profile data)

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace)
3. Fill in:
   - **App name**: Hatch
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **Save and Continue**
5. **Scopes**: Add `email`, `profile`, `openid`
6. **Test users**: Add your test email addresses
7. Click **Save and Continue**

### 4. Create OAuth Credentials

#### Web Client (Backend + Frontend)

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Hatch Web`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://hatch-app.fly.dev
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:8000/api/auth/google/callback
   https://hatch-api.fly.dev/api/auth/google/callback
   ```
7. Click **Create**
8. Copy **Client ID** and **Client Secret**

#### iOS Client (Mobile)

1. Click **Create Credentials** → **OAuth client ID**
2. Application type: **iOS**
3. Name: `Hatch iOS`
4. **Bundle ID**: `com.hatch.app`
5. Click **Create**
6. Copy **Client ID** (no secret for iOS)

#### Android Client (Mobile)

1. Click **Create Credentials** → **OAuth client ID**
2. Application type: **Android**
3. Name: `Hatch Android`
4. **Package name**: `com.hatch.app`
5. **SHA-1 certificate fingerprint**:
   ```bash
   # Debug keystore
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
6. Click **Create**
7. Copy **Client ID**

### 5. Configure Environment Variables

#### Backend `.env`

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
```

#### Frontend `.env.local`

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

#### Mobile `.env`

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-ios.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-android.apps.googleusercontent.com
```

### 6. Mobile-Specific Configuration

Update `mobile/app.json`:

```json
{
  "plugins": [
    [
      "@react-native-google-signin/google-signin",
      {
        "iosUrlScheme": "com.googleusercontent.apps.YOUR-IOS-CLIENT-ID"
      }
    ]
  ]
}
```

**Note:** The `iosUrlScheme` is the iOS Client ID reversed (e.g., if your ID is `123456789-abc.apps.googleusercontent.com`, the scheme is `com.googleusercontent.apps.123456789-abc`).

### OAuth Credentials Summary

| Client | Use | Environment Variable |
|--------|-----|---------------------|
| Web | Backend + Frontend | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| iOS | Mobile app | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| Android | Mobile app | `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` |

---

## Gmail SMTP Setup

Gmail SMTP is used for sending email notifications (optional feature).

### 1. Enable 2-Factor Authentication

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**

### 2. Generate App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select app: **Mail**
3. Select device: **Other** → Enter "Hatch"
4. Click **Generate**
5. Copy the 16-character password

### 3. Configure Environment

```env
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx  # App password, not regular password
MAIL_FROM=your-email@gmail.com
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_STARTTLS=true
MAIL_SSL_TLS=false
```

### 4. Test Email

```python
# In Python shell
from app.services.email import send_invite_email

await send_invite_email(
    to_email="test@example.com",
    invite_code="TEST123",
    inviter_name="Test User"
)
```

---

## Google Gemini API

Gemini is used for **pre-computing** AI-powered name facts (etymology, meanings, famous people). Facts are generated offline via batch processing scripts and stored in the database - there are no runtime API calls.

### 1. Get API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click **Get API key**
3. Create or select a project
4. Copy the API key

### 2. Configure Environment

```env
GEMINI_API_KEY=AIzaSy...your-key
```

**Note:** This variable is only used by seed scripts, not the runtime backend.

### 3. Models Used

| Model | Purpose | Script |
|-------|---------|--------|
| `gemini-2.5-flash` | Generate name facts (Batch API) | `app/seed/compute_name_facts_batch.py` |
| `text-embedding-004` | Compute name similarity embeddings | `app/seed/compute_fact_embeddings.py` |

### 4. Usage - Batch Processing

Facts are pre-computed using the Batch API (50% cheaper than streaming):

```bash
cd backend

# Submit batch job to generate facts
python -m app.seed.compute_name_facts_batch submit

# Check job status
python -m app.seed.compute_name_facts_batch status

# Download results and import to database
python -m app.seed.compute_name_facts_batch download
```

Embeddings for similarity search:

```bash
# Compute embeddings for names with facts
python -m app.seed.compute_fact_embeddings

# Or limit for testing
python -m app.seed.compute_fact_embeddings --limit 100
```

### 5. How It Works

1. **Batch job generates facts** for each name (origin, meaning, nicknames, famous people)
2. **Results stored in** `name_facts` table in database
3. **Embeddings computed** for phonetic, etymology, and associations similarity
4. **Runtime API endpoint** (`GET /api/names/{id}/facts`) queries pre-computed data

### 6. Rate Limits

| API | Tier | Limit |
|-----|------|-------|
| Batch API | Free | 1 million tokens/day |
| Embedding API | Free | 100 requests/minute |

---

## Production Secrets (Fly.io)

### Set All Secrets

```bash
cd backend

fly secrets set \
  GOOGLE_CLIENT_ID="123456789-abc.apps.googleusercontent.com" \
  GOOGLE_CLIENT_SECRET="GOCSPX-your-secret" \
  JWT_SECRET="your-64-char-hex-secret" \
  ADMIN_EMAILS="admin@example.com" \
  GEMINI_API_KEY="AIzaSy..." \
  MAIL_USERNAME="your-email@gmail.com" \
  MAIL_PASSWORD="xxxx-xxxx-xxxx-xxxx" \
  MAIL_FROM="your-email@gmail.com"
```

### Verify Secrets

```bash
fly secrets list
```

---

## Troubleshooting

### Google OAuth Issues

| Issue | Solution |
|-------|----------|
| "redirect_uri_mismatch" | Check redirect URIs in Google Console match exactly |
| "invalid_client" | Verify Client ID and Secret are correct |
| "access_denied" | User not in test users (if app is in testing mode) |
| Mobile sign-in fails | Check iOS/Android client IDs and bundle/package names |

### Gmail SMTP Issues

| Issue | Solution |
|-------|----------|
| "Authentication failed" | Use App Password, not regular password |
| "Less secure apps" | Enable 2FA and use App Password |
| "Daily limit exceeded" | Gmail limits: 500/day for free, 2000/day for Workspace |

### Gemini API Issues

| Issue | Solution |
|-------|----------|
| "API key not valid" | Check key is correct in environment |
| "Rate limit exceeded" | Use batch processing, reduce batch size |
| "Model not found" | Use `gemini-2.5-flash` for facts, `text-embedding-004` for embeddings |

---

## Security Best Practices

### API Keys & Secrets

| Practice | Reason |
|----------|--------|
| Never commit secrets | Use `.env` files (gitignored) |
| Use different keys per environment | Isolate dev/prod |
| Rotate keys periodically | Limit damage if compromised |
| Restrict API key permissions | Limit to necessary APIs only |

### OAuth

| Practice | Reason |
|----------|--------|
| Verify redirect URIs | Prevent open redirect attacks |
| Use state parameter | Prevent CSRF (handled by Authlib) |
| Keep consent screen info accurate | Build user trust |

---

## Checklist

### Google OAuth

- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] Web client credentials created
- [ ] iOS client credentials created (for mobile)
- [ ] Android client credentials created (for mobile)
- [ ] Redirect URIs configured for all environments
- [ ] Environment variables set

### Gmail SMTP (Optional)

- [ ] 2-Factor Authentication enabled
- [ ] App Password generated
- [ ] Environment variables set
- [ ] Test email sent successfully

### Google Gemini (Optional)

- [ ] API key generated
- [ ] `GEMINI_API_KEY` environment variable set
- [ ] Batch job submitted and completed
- [ ] Name facts imported to database
- [ ] Embeddings computed for similarity search

---

## Related Documentation

- [auth-system.md](auth-system.md) - How OAuth is used in the app
- [environment.md](environment.md) - All environment variables
- [deployment.md](deployment.md) - Setting production secrets
- [mobile.md](mobile.md) - Mobile-specific OAuth setup
