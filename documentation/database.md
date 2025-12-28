# Database

This document describes the database schema, models, and migration workflow for Hatch.

---

## Overview

| Aspect | Details |
|--------|---------|
| **Database** | SQLite |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Migrations** | Alembic |
| **Connection** | aiosqlite (async driver) |
| **Location** | `backend/data/baby_names.db` |

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     couples     │       │      users      │       │ user_preferences│
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ couple_id (FK)  │──────►│ user_id (FK,UQ) │
│ created_by (FK) │───────│ id (PK)         │       │ id (PK)         │
│ created_at      │       │ google_id (UQ)  │       │ origins         │
└────────┬────────┘       │ email (UQ)      │       │ genders         │
         │                │ display_name    │       │ starting_letters│
         │                │ family_name     │       │ max_length      │
         │                │ avatar_url      │       └─────────────────┘
         │                │ created_at      │
         │                │ updated_at      │
         │                └────────┬────────┘
         │                         │
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│    invites      │       │    swipes       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ code (UQ)       │       │ user_id (FK)    │◄─────┐
│ couple_id (FK)  │       │ name_id (FK)    │──────┼─────┐
│ invited_by (FK) │       │ couple_id (FK)  │      │     │
│ invited_email   │       │ action          │      │     │
│ status          │       │ created_at      │      │     │
│ expires_at      │       │ updated_at      │      │     │
│ created_at      │       └─────────────────┘      │     │
└─────────────────┘                                │     │
                                                   │     │
┌─────────────────┐       ┌─────────────────┐      │     │
│  custom_names   │       │     names       │◄─────┘     │
├─────────────────┤       ├─────────────────┤            │
│ id (PK)         │       │ id (PK)         │◄───────────┘
│ user_id (FK)    │       │ name            │
│ couple_id (FK)  │       │ gender          │
│ name            │       │ meaning         │
│ gender          │       │ length          │
│ created_at      │       │ embedding       │
└─────────────────┘       └────────┬────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
            ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ name_popularity │   │   name_facts    │   │name_similarities│
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ id (PK)         │   │ id (PK)         │   │ id (PK)         │
│ name_id (FK)    │   │ name_id (FK,UQ) │   │ name_id (FK)    │
│ country_code    │   │ origin_language │   │ similar_name_id │
│ popularity_rank │   │ meaning         │   │ similarity      │
│ weighted_count  │   │ nicknames       │   │ rank            │
│ total_count     │   │ historical_fig  │   └─────────────────┘
└─────────────────┘   │ fictional_char  │
                      │ cultural_refs   │
                      │ embedding_*     │
                      │ created_at      │
                      └─────────────────┘
```

---

## Models

### Users

Stores user accounts from Google OAuth.

```python
class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    google_id = Column(Text, unique=True, nullable=False)
    email = Column(Text, unique=True, nullable=False)
    display_name = Column(Text, nullable=True)
    family_name = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)
    couple_id = Column(String(36), ForeignKey("couples.id"))
    created_at = Column(Text)
    updated_at = Column(Text)
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `google_id` | Text | Google OAuth subject ID |
| `email` | Text | User's email address |
| `display_name` | Text | Name from Google profile |
| `family_name` | Text | Custom family name for preview |
| `avatar_url` | Text | Profile picture URL |
| `couple_id` | UUID FK | Link to couple |

**Relationships:**
- `couple` → Couple (many-to-one)
- `preferences` → UserPreference (one-to-one)
- `swipes` → Swipe (one-to-many)
- `custom_names` → CustomName (one-to-many)

---

### Couples

Groups two users together for shared matching.

```python
class Couple(Base):
    __tablename__ = "couples"

    id = Column(String(36), primary_key=True)
    created_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(Text)
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `created_by` | UUID FK | User who created the couple |
| `created_at` | Text | Creation timestamp |

**Notes:**
- Every user gets a couple created when they sign up
- Partners join via invite system
- A couple can have 1-2 users

---

### Names

Core name entries with basic metadata.

```python
class Name(Base):
    __tablename__ = "names"

    id = Column(String(36), primary_key=True)
    name = Column(Text, nullable=False)
    gender = Column(Text)  # M, F, U
    meaning = Column(Text)
    length = Column(Integer)
    embedding = Column(Text)  # JSON-encoded vector
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | Text | The name (e.g., "James") |
| `gender` | Text | M=Male, F=Female, U=Unisex |
| `meaning` | Text | Brief meaning/origin |
| `length` | Integer | Character count |
| `embedding` | Text | Vector embedding (JSON) |

**Constraints:**
- `UNIQUE(name, gender)` - Same name can exist for different genders
- `CHECK(gender IN ('M', 'F', 'U'))`

---

### NamePopularity

Per-country popularity statistics for names.

```python
class NamePopularity(Base):
    __tablename__ = "name_popularity"

    id = Column(String(36), primary_key=True)
    name_id = Column(String(36), ForeignKey("names.id"))
    country_code = Column(String(2))  # ISO 3166-1 alpha-2
    popularity_rank = Column(Integer)
    weighted_count = Column(Float)
    total_count = Column(Integer)
```

| Column | Type | Description |
|--------|------|-------------|
| `name_id` | UUID FK | Reference to name |
| `country_code` | String(2) | ISO country code (US, IT, GB, etc.) |
| `popularity_rank` | Integer | Rank within country (1 = most popular) |
| `weighted_count` | Float | Time-weighted popularity score |
| `total_count` | Integer | Raw historical count |

**Constraints:**
- `UNIQUE(name_id, country_code)`

---

### NameFact

Enriched name data from AI (Gemini).

```python
class NameFact(Base):
    __tablename__ = "name_facts"

    id = Column(String(36), primary_key=True)
    name_id = Column(String(36), ForeignKey("names.id"), unique=True)
    origin_language = Column(Text)
    meaning = Column(Text)
    nicknames = Column(Text)  # JSON array
    historical_figures = Column(Text)  # JSON array
    fictional_characters = Column(Text)  # JSON array
    cultural_references = Column(Text)  # JSON object
    embedding_phonetic = Column(Text)
    embedding_etymology = Column(Text)
    embedding_associations = Column(Text)
    created_at = Column(DateTime)
```

| Column | Type | Description |
|--------|------|-------------|
| `origin_language` | Text | "Hebrew", "Latin", etc. |
| `meaning` | Text | Full etymology/meaning |
| `nicknames` | JSON | ["Jim", "Jimmy", "Jamie"] |
| `historical_figures` | JSON | [{name, description}] |
| `fictional_characters` | JSON | [{name, source, description}] |
| `cultural_references` | JSON | {religious, mythological, literary} |
| `embedding_*` | Text | Vector embeddings for similarity |

---

### NameSimilarity

Pre-computed similar names for fast lookup.

```python
class NameSimilarity(Base):
    __tablename__ = "name_similarities"

    id = Column(String(36), primary_key=True)
    name_id = Column(String(36), ForeignKey("names.id"))
    similar_name_id = Column(String(36), ForeignKey("names.id"))
    similarity = Column(Float)
    rank = Column(Integer)  # 1-20
```

| Column | Type | Description |
|--------|------|-------------|
| `name_id` | UUID FK | Source name |
| `similar_name_id` | UUID FK | Similar name |
| `similarity` | Float | Cosine similarity (0-1) |
| `rank` | Integer | Rank (1 = most similar) |

---

### Swipes

User decisions on names (like/dismiss).

```python
class Swipe(Base):
    __tablename__ = "swipes"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"))
    name_id = Column(String(36), ForeignKey("names.id"))
    couple_id = Column(String(36), ForeignKey("couples.id"))
    action = Column(Text)  # like, dismiss
    created_at = Column(Text)
    updated_at = Column(Text)
```

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID FK | Who swiped |
| `name_id` | UUID FK | What name |
| `couple_id` | UUID FK | For match detection |
| `action` | Text | "like" or "dismiss" |

**Constraints:**
- `UNIQUE(user_id, name_id)` - One decision per name per user
- `CHECK(action IN ('like', 'dismiss'))`

**Match Detection:**
A match occurs when both users in a couple have `action='like'` for the same `name_id`.

---

### Invites

Partner invitation codes.

```python
class Invite(Base):
    __tablename__ = "invites"

    id = Column(String(36), primary_key=True)
    code = Column(Text, unique=True)
    couple_id = Column(String(36), ForeignKey("couples.id"))
    invited_by = Column(String(36), ForeignKey("users.id"))
    invited_email = Column(Text)
    status = Column(Text)  # pending, accepted, expired
    expires_at = Column(Text)
    created_at = Column(Text)
```

---

### UserPreference

User filter settings for name discovery.

```python
class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True)
    origins = Column(Text)  # JSON array
    genders = Column(Text)  # JSON array
    starting_letters = Column(Text)  # JSON array
    max_length = Column(Integer)
    updated_at = Column(Text)
```

**JSON Fields:**
```json
{
  "origins": ["US", "IT", "IE"],
  "genders": ["M", "F"],
  "starting_letters": ["A", "J", "M"]
}
```

---

### CustomName

User-added names not in the main database.

```python
class CustomName(Base):
    __tablename__ = "custom_names"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"))
    couple_id = Column(String(36), ForeignKey("couples.id"))
    name = Column(Text)
    gender = Column(Text)  # M, F, U
    created_at = Column(Text)
```

---

## SQLite Conventions

Since SQLite has limited type support, the codebase uses these conventions:

| Data Type | SQLite Storage | Notes |
|-----------|----------------|-------|
| UUID | `TEXT (36)` | Generated in Python: `uuid.uuid4()` |
| DateTime | `TEXT` | ISO format: `datetime('now')` |
| Boolean | `INTEGER` | 0 or 1 |
| JSON | `TEXT` | Serialized JSON string |
| Enum | `TEXT` + CHECK | e.g., `CHECK(gender IN ('M','F','U'))` |

---

## Indexes

Performance indexes for common queries:

```sql
-- Fast user lookup by Google ID
CREATE INDEX idx_users_google_id ON users(google_id);

-- Fast name search by country
CREATE INDEX idx_name_popularity_country ON name_popularity(country_code);
CREATE INDEX idx_popularity_country_weight ON name_popularity(country_code, weighted_count);

-- Fast swipe queries
CREATE INDEX idx_swipes_user_action ON swipes(user_id, action);
CREATE INDEX idx_swipes_couple_name ON swipes(couple_id, name_id);

-- Fast similarity lookup
CREATE INDEX idx_name_similarities_name ON name_similarities(name_id);
```

---

## Migration Workflow

### Alembic Setup

Migrations are managed with Alembic in `backend/alembic/`.

```
backend/
├── alembic.ini          # Alembic configuration
└── alembic/
    ├── env.py           # Migration environment
    ├── script.py.mako   # Template for new migrations
    └── versions/        # Migration files
        ├── 001_initial.py
        ├── 002_add_name_groups.py
        └── ...
```

### Common Commands

```bash
cd backend
source venv/bin/activate

# Check current version
alembic current

# View migration history
alembic history

# Apply all pending migrations
alembic upgrade head

# Create new migration (after model changes)
alembic revision --autogenerate -m "Add new column"

# Rollback one migration
alembic downgrade -1

# Rollback to specific version
alembic downgrade 001

# Mark current state without running migrations
alembic stamp head
```

### Creating a Migration

1. **Modify the model** in `backend/app/models/`

2. **Generate migration:**
   ```bash
   alembic revision --autogenerate -m "Add xyz column to users"
   ```

3. **Review the generated file** in `alembic/versions/`

4. **Apply migration:**
   ```bash
   alembic upgrade head
   ```

### Migration Best Practices

| Practice | Reason |
|----------|--------|
| Review auto-generated migrations | Autogenerate may miss some changes |
| Test rollback | Ensure `downgrade()` works |
| Small, focused migrations | Easier to debug and rollback |
| Descriptive names | `add_avatar_url_to_users` not `update_model` |

---

## Seeding Data

### Import Names

```bash
cd backend
source venv/bin/activate
python -m app.seed.import_names
```

This imports from `data/merged/merged_names.csv`.

### Compute Similarities

```bash
python -m app.seed.compute_similarities
```

Pre-computes name similarity scores.

---

## Database Location

### Development

```
backend/data/baby_names.db
```

### Production (Fly.io)

```
/app/data/baby_names.db
```

Mounted on a persistent volume `hatch_data`.

---

## Backup & Restore

### Local Backup

```bash
cp backend/data/baby_names.db backend/data/baby_names.db.backup
```

### Production Backup

```bash
# SSH into Fly.io and copy
fly ssh console -C "cp /app/data/baby_names.db /app/data/backup.db"

# Download via SFTP
fly sftp get /app/data/baby_names.db ./baby_names_backup.db
```

### Restore

```bash
# Stop the app first
fly machines stop

# Upload backup
fly sftp shell
> put baby_names_backup.db /app/data/baby_names.db

# Restart
fly machines start
```

---

## Query Examples

### Find Matches (Both Users Liked)

```sql
SELECT n.name, n.gender
FROM swipes s1
JOIN swipes s2 ON s1.name_id = s2.name_id
  AND s1.couple_id = s2.couple_id
  AND s1.user_id != s2.user_id
JOIN names n ON s1.name_id = n.id
WHERE s1.action = 'like' AND s2.action = 'like'
  AND s1.couple_id = 'couple-uuid';
```

### Popular Names by Country

```sql
SELECT n.name, n.gender, np.popularity_rank
FROM names n
JOIN name_popularity np ON n.id = np.name_id
WHERE np.country_code = 'US'
ORDER BY np.popularity_rank
LIMIT 20;
```

### Unswiped Names for User

```sql
SELECT n.*
FROM names n
WHERE n.id NOT IN (
  SELECT name_id FROM swipes WHERE user_id = 'user-uuid'
)
ORDER BY RANDOM()
LIMIT 20;
```

---

## Related Documentation

- [local-development.md](local-development.md) - Database setup
- [deployment.md](deployment.md) - Production database management
- [api-reference.md](api-reference.md) - Endpoints that use these models
