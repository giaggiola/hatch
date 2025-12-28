# API Reference

This document provides a complete reference for the Hatch API endpoints.

---

## Overview

| Base URL | Description |
|----------|-------------|
| Development | `http://localhost:8000/api` |
| Production | `https://hatch-api.fly.dev/api` |

### Authentication

Most endpoints require authentication via:
- **Web**: httpOnly cookie (`auth_token`)
- **Mobile/API**: `Authorization: Bearer <jwt>` header

### Response Format

All responses are JSON with consistent error format:

```json
{
  "detail": "Error message here"
}
```

### Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Auth | 10/minute |
| Swipes | 60/minute |
| Search | 30/minute |
| Invites | 5/minute |

---

## Authentication

### `GET /api/auth/google`

Redirect to Google OAuth login.

**Auth Required:** No

**Response:** Redirects to Google login page

---

### `GET /api/auth/google/callback`

OAuth callback handler. Creates/updates user and redirects to frontend with token.

**Auth Required:** No

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `code` | string | OAuth authorization code |

**Response:** Redirects to `{FRONTEND_URL}/auth/callback?token=xxx`

---

### `POST /api/auth/google/mobile`

Mobile OAuth endpoint. Exchange Google access token for JWT.

**Auth Required:** No

**Request Body:**
```json
{
  "access_token": "google-access-token"
}
```

**Response:**
```json
{
  "access_token": "jwt-token-here",
  "token_type": "bearer"
}
```

---

### `GET /api/auth/me`

Get current authenticated user.

**Auth Required:** Yes

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "family_name": "Smith",
  "avatar_url": "https://...",
  "couple_id": "uuid"
}
```

---

### `POST /api/auth/logout`

Logout (frontend handles clearing its own cookie).

**Auth Required:** No

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

### `POST /api/auth/dev-login`

Development-only login endpoint.

**Auth Required:** No

**Requires:** `DEBUG=true` in environment

**Response:**
```json
{
  "access_token": "jwt-token",
  "token_type": "bearer"
}
```

---

## Users

### `PATCH /api/users/me`

Update current user's profile.

**Auth Required:** Yes

**Request Body:**
```json
{
  "display_name": "Jane Doe",
  "family_name": "Johnson"
}
```

**Response:** Updated user object

---

### `DELETE /api/users/me`

Delete current user and all their data.

**Auth Required:** Yes

**Response:**
```json
{
  "message": "Account deleted successfully"
}
```

---

### `GET /api/users/partner`

Get partner info if in a couple.

**Auth Required:** Yes

**Response:**
```json
{
  "id": "uuid",
  "display_name": "Partner Name",
  "avatar_url": "https://..."
}
```

Or `null` if no partner.

---

## Invites

### `POST /api/invites`

Create a new invite link. Sends email if email is provided.

**Auth Required:** Yes (User must be in a couple)

**Request Body:**
```json
{
  "invited_email": "partner@example.com"  // optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "code": "BABY-7X9K",
  "status": "pending",
  "invited_email": "partner@example.com",
  "expires_at": "2024-01-15T00:00:00"
}
```

---

### `GET /api/invites/{code}`

Get invite details by code.

**Auth Required:** No

**Response:**
```json
{
  "code": "BABY-7X9K",
  "status": "pending",
  "invited_by_name": "John Doe"
}
```

---

### `POST /api/invites/{code}/accept`

Accept an invite and join the couple.

**Auth Required:** Yes

**Response:**
```json
{
  "message": "Successfully joined couple"
}
```

---

## Names

### `GET /api/names`

Get names for swiping (excludes already swiped names).

**Auth Required:** Yes

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 20 | Max names to return (max 100) |

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "James",
    "gender": "M",
    "meaning": "Supplanter",
    "length": 5,
    "countries": ["US", "GB", "IE"],
    "popularity_rank": 5,
    "weighted_count": 12345.67
  }
]
```

---

### `GET /api/names/swipe`

Get names for swiping with similar names included.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 10 | Max names to return (max 50) |

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "James",
    "gender": "M",
    "countries": ["US", "GB"],
    "similar": [
      {
        "id": "uuid",
        "name": "Jamie",
        "gender": "U",
        "similarity": 0.92,
        "countries": ["GB", "IE"]
      }
    ]
  }
]
```

---

### `GET /api/names/{id}`

Get name details by ID.

**Auth Required:** No

**Response:**
```json
{
  "id": "uuid",
  "name": "James",
  "gender": "M",
  "meaning": "Supplanter, from Hebrew",
  "length": 5,
  "countries": ["US", "GB", "IE"],
  "popularity_rank": 5,
  "weighted_count": 12345.67
}
```

---

### `GET /api/names/{id}/detail`

Get a name with similar variants for the detail/explore page.

**Auth Required:** No

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 10 | Max similar names (max 20) |
| `min_similarity` | float | 0.84 | Minimum similarity score (0.5-1.0) |

**Response:**
```json
{
  "id": "uuid",
  "name": "James",
  "gender": "M",
  "meaning": "Supplanter",
  "length": 5,
  "countries": ["US", "GB"],
  "popularity_rank": 5,
  "weighted_count": 12345.67,
  "similar": [
    {
      "id": "uuid",
      "name": "Jamie",
      "gender": "U",
      "similarity": 0.92,
      "countries": ["GB", "IE"],
      "popularity_rank": 45,
      "weighted_count": 5678.90
    }
  ]
}
```

---

### `GET /api/names/{id}/similar`

Get similar names using embedding similarity.

**Auth Required:** No

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 10 | Max results (max 20) |
| `min_similarity` | float | 0.84 | Minimum similarity score (0.5-1.0) |
| `gender` | string | - | Filter by gender (M, F, U, or 'same' to match source name) |

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Jamie",
    "gender": "U",
    "similarity": 0.92,
    "countries": ["GB", "IE"],
    "popularity_rank": 45
  }
]
```

---

### `GET /api/names/{id}/facts`

Get enriched facts about a name (origin, meaning, nicknames, famous people).

**Auth Required:** No

**Response:**
```json
{
  "origin_language": "Hebrew",
  "meaning": "Supplanter, one who follows",
  "nicknames": ["Jim", "Jimmy", "Jamie"],
  "historical_figures": [
    {
      "name": "James Madison",
      "description": "4th President of the United States"
    }
  ],
  "fictional_characters": [
    {
      "name": "James Bond",
      "source": "Ian Fleming novels",
      "description": "British secret agent 007"
    }
  ],
  "cultural_references": {
    "religious": "Saint James the Greater",
    "literary": "Multiple kings of England"
  }
}
```

---

### `GET /api/names/{id}/popularity-by-region`

Get popularity breakdown by country.

**Auth Required:** No

**Response:**
```json
[
  {
    "country_code": "US",
    "country_name": "United States",
    "popularity_rank": 5,
    "percentile": 0.01,
    "weighted_count": 50000
  },
  {
    "country_code": "GB",
    "country_name": "United Kingdom",
    "popularity_rank": 12,
    "percentile": 0.02,
    "weighted_count": 30000
  }
]
```

---

### `GET /api/names/search`

Search names by prefix (autocomplete), sorted by popularity.

**Auth Required:** No (Rate limited: 30/minute)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | - | Search query (required, 1-50 chars) |
| `limit` | int | 20 | Max results (max 50) |

**Response:** Array of name objects

---

### `GET /api/names/popular`

Get most popular names globally.

**Auth Required:** No

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `gender` | string | - | Filter by M, F, or U |
| `limit` | int | 10 | Max results (max 50) |

**Response:** Array of name objects

---

### `GET /api/names/countries`

Get list of available countries with name counts.

**Auth Required:** No

**Response:**
```json
[
  {
    "code": "US",
    "name": "usa",
    "count": 50000
  },
  {
    "code": "GB",
    "name": "united kingdom",
    "count": 40000
  }
]
```

---

### `GET /api/names/origins`

Get list of available origins (country names) with name counts.

**Auth Required:** No

**Response:**
```json
[
  {
    "name": "Italian",
    "count": 15000
  },
  {
    "name": "Irish",
    "count": 8000
  }
]
```

---

### `GET /api/names/by-origin/{origin}`

Get names by origin/country.

**Auth Required:** No

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 50 | Max results (max 200) |
| `offset` | int | 0 | Pagination offset |

**Response:** Array of name objects

---

## Swipes

### `GET /api/swipes/check/{name_id}`

Check if a name has been swiped.

**Auth Required:** Yes

**Response:**
```json
{
  "action": "like"  // or "dismiss" or null
}
```

---

### `POST /api/swipes`

Record a swipe on a name.

**Auth Required:** Yes

**Request Body:**
```json
{
  "name_id": "uuid",
  "action": "like"  // or "dismiss"
}
```

**Response:**
```json
{
  "match": true,
  "name": {
    "id": "uuid",
    "name": "James",
    "gender": "M"
  }
}
```

If `match` is true, both partners liked this name.

---

### `POST /api/swipes/batch`

Batch swipe multiple names.

**Auth Required:** Yes

**Request Body:**
```json
{
  "swipes": [
    { "name_id": "uuid1", "action": "like" },
    { "name_id": "uuid2", "action": "dismiss" }
  ]
}
```

**Response:**
```json
{
  "created": 2,
  "matches": [
    {
      "id": "uuid",
      "name": "James",
      "gender": "M"
    }
  ]
}
```

---

### `GET /api/swipes`

Get swipe history.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `action` | string | - | Filter by "like" or "dismiss" |
| `limit` | int | 50 | Max results |
| `offset` | int | 0 | Pagination offset |

**Response:**
```json
[
  {
    "id": "uuid",
    "name_id": "uuid",
    "action": "like",
    "created_at": "2024-01-01T00:00:00",
    "name": {
      "id": "uuid",
      "name": "James",
      "gender": "M"
    }
  }
]
```

---

### `GET /api/swipes/counts`

Get swipe counts.

**Auth Required:** Yes

**Response:**
```json
{
  "likes": 150,
  "dismisses": 300
}
```

---

### `PATCH /api/swipes/{name_id}`

Change a previous swipe.

**Auth Required:** Yes

**Request Body:**
```json
{
  "action": "dismiss"  // or "like"
}
```

**Response:** Same as POST /api/swipes

---

### `DELETE /api/swipes/{name_id}`

Remove a swipe (name goes back to queue).

**Auth Required:** Yes

**Response:**
```json
{
  "message": "Swipe removed"
}
```

---

## Matches

### `GET /api/matches`

Get all matches for the couple.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 50 | Max results |
| `offset` | int | 0 | Pagination offset |

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "James",
    "gender": "M",
    "countries": ["US", "GB"],
    "matched_at": "2024-01-01T12:00:00"
  }
]
```

---

### `GET /api/matches/close-calls`

Get close calls (similar names where partners liked different variants).

**Auth Required:** Yes

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 20 | Max results |
| `min_similarity` | float | 0.75 | Minimum similarity |

**Response:**
```json
[
  {
    "similarity": 0.85,
    "your_name": {
      "id": "uuid",
      "name": "Maria",
      "gender": "F"
    },
    "partner_name": {
      "id": "uuid",
      "name": "Marie",
      "gender": "F"
    }
  }
]
```

---

## Preferences

### `GET /api/preferences`

Get user's filter preferences.

**Auth Required:** Yes

**Response:**
```json
{
  "origins": ["US", "IT", "IE"],
  "genders": ["M", "F"],
  "starting_letters": ["A", "J"],
  "max_length": 8
}
```

---

### `PUT /api/preferences`

Update filter preferences.

**Auth Required:** Yes

**Request Body:**
```json
{
  "origins": ["US", "GB"],
  "genders": ["F"],
  "starting_letters": [],
  "max_length": null
}
```

**Response:** Updated preferences object

---

## Custom Names

### `POST /api/custom-names`

Add a custom name.

**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "Unique Name",
  "gender": "U"  // M, F, or U
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Unique Name",
  "gender": "U",
  "user_id": "uuid",
  "couple_id": "uuid",
  "created_at": "2024-01-01T00:00:00"
}
```

---

### `GET /api/custom-names`

Get all custom names for the couple.

**Auth Required:** Yes

**Response:** Array of custom name objects

---

### `DELETE /api/custom-names/{id}`

Delete a custom name.

**Auth Required:** Yes

**Response:**
```json
{
  "message": "Custom name deleted"
}
```

---

## Root Endpoints

### `GET /`

Root endpoint returning API info.

**Auth Required:** No

**Response:**
```json
{
  "message": "Hatch API",
  "docs": "/docs"
}
```

---

### `GET /health`

Health check endpoint.

**Auth Required:** No

**Response:**
```json
{
  "status": "healthy"
}
```

---

### `GET /favicon.ico`

Favicon file.

**Auth Required:** No

**Response:** ICO file

---

### `GET /admin`

SQLAdmin panel (admin users only).

**Auth Required:** Yes (admin session via Google OAuth)

---

## Error Responses

### 400 Bad Request

```json
{
  "detail": "Invalid request data"
}
```

### 401 Unauthorized

```json
{
  "detail": "Not authenticated"
}
```

### 404 Not Found

```json
{
  "detail": "Resource not found"
}
```

### 429 Too Many Requests

```json
{
  "detail": "Rate limit exceeded"
}
```

---

## Interactive Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Related Documentation

- [auth-system.md](auth-system.md) - Authentication details
- [architecture.md](architecture.md) - System overview
- [database.md](database.md) - Data models
