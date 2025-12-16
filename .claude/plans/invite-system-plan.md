# Implementation Plan: QR Code + Email Invites + Auth Verification

## Overview
Add QR code sharing for partner invites, email invitation sending via Gmail SMTP, and verify auth protection across the app.

---

## Part 1: QR Code Generation

### Frontend Changes

**1. Install QR code library**
```bash
cd frontend && npm install qrcode.react
```

**2. Create QR Code component**
- File: `frontend/src/components/InviteQRCode.tsx`
- Renders QR code for invite URL using `qrcode.react`
- Size: 200x200px
- Props: `code: string` (the invite code)
- Features:
  - Display QR code encoding full invite URL
  - Download as PNG button
  - Visual styling to match app theme

**3. Create Invite Share Modal**
- File: `frontend/src/components/InviteShareModal.tsx`
- Full-screen modal with multiple sharing options
- Contents:
  - Large QR code (centered)
  - Invite URL text field
  - Copy link button
  - Share via native share (Web Share API)
  - Email input + Send button (optional email invite)
  - Close button

**4. Update Settings Page** (`frontend/src/app/settings/page.tsx`)
- Replace current inline invite code display with "Share Invite" button
- Button opens InviteShareModal
- Keep "Invite partner" button for creating new invite

### Files to Create/Modify
| File | Action |
|------|--------|
| `frontend/package.json` | Add `qrcode.react` dependency |
| `frontend/src/components/InviteQRCode.tsx` | **NEW** - QR code component |
| `frontend/src/components/InviteShareModal.tsx` | **NEW** - Share modal |
| `frontend/src/app/settings/page.tsx` | Integrate share modal |

---

## Part 2: Email Invitations (Gmail SMTP)

### Backend Changes

**1. Add fastapi-mail library**
```
fastapi-mail>=1.4.1
```

**2. Update config** (`backend/app/config.py`)
Add new settings:
```python
# Email Configuration (Gmail SMTP)
mail_username: str = ""
mail_password: str = ""
mail_from: str = ""
mail_server: str = "smtp.gmail.com"
mail_port: int = 587
mail_starttls: bool = True
mail_ssl_tls: bool = False
```

**3. Create email service** (`backend/app/services/email.py`)
- Configure FastMail with Gmail SMTP settings
- `send_invite_email(to_email, invite_code, inviter_name, frontend_url)`
  - Builds invite URL
  - Sends HTML email with greeting, CTA button, expiration notice
  - Plain text fallback
- Error handling (log failures, don't crash)

**4. Create email template** (`backend/app/templates/invite_email.html`)
- "You've been invited!" heading
- "{inviter_name} wants to pick baby names with you"
- Large CTA button: "Accept Invitation"
- Invite code displayed (backup)
- "This invite expires in 7 days"

**5. Update invite router** (`backend/app/routers/invites.py`)
- Send email if `invited_email` provided
- Don't fail request if email fails

### Environment Variables
```
MAIL_USERNAME=topoi.app.service@gmail.com
MAIL_PASSWORD=vvfmrolmmftyppyg
MAIL_FROM=topoi.app.service@gmail.com
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

### Files to Create/Modify
| File | Action |
|------|--------|
| `backend/requirements.txt` | Add `fastapi-mail>=1.4.1` |
| `backend/app/config.py` | Add email settings |
| `backend/app/services/email.py` | **NEW** - Email service |
| `backend/app/templates/invite_email.html` | **NEW** - Email template |
| `backend/app/routers/invites.py` | Trigger email on create |

---

## Part 3: Auth Verification

### Frontend Route Guards to Verify
- `/swipe` - checks `isAuthenticated()` ✓
- `/settings` - checks `isAuthenticated()` ✓
- `/history` - needs verification
- `/explore` - needs verification
- `/invite/[code]` - allows unauthenticated (intentional)

### Fixes Needed
1. Verify `/history` and `/explore` pages have auth guards
2. Add `isAuthenticated()` check if missing

---

## Implementation Order

1. **Auth Verification** - Quick audit of history/explore pages
2. **QR Code** - Install library, create components, integrate
3. **Email Service** - Backend service, template, router update, frontend email input

---

## Files Summary

### New Files (4)
- `frontend/src/components/InviteQRCode.tsx`
- `frontend/src/components/InviteShareModal.tsx`
- `backend/app/services/email.py`
- `backend/app/templates/invite_email.html`

### Modified Files (6)
- `frontend/package.json`
- `frontend/src/app/settings/page.tsx`
- `frontend/src/app/history/page.tsx` (if needed)
- `frontend/src/app/explore/page.tsx` (if needed)
- `backend/requirements.txt`
- `backend/app/config.py`
- `backend/app/routers/invites.py`

---

## Testing Checklist

- [ ] QR code renders correctly with invite URL
- [ ] QR code scans and opens correct invite page
- [ ] Copy link button works
- [ ] Native share opens share sheet (mobile)
- [ ] Email sends successfully via Gmail SMTP
- [ ] Email contains correct invite link
- [ ] Unauthenticated users redirected from protected pages
- [ ] Invite flow works end-to-end