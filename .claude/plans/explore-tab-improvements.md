# Explore Tab Improvements Plan

## Overview
Enhance the Explore tab with a smart autocomplete search, curated content sections, and a dedicated name detail page.

---

## Part 1: Smart Autocomplete Search

### Current State
- Simple client-side text filter for countries only
- Backend has `/api/names/search` but it's unused and sorts alphabetically

### Proposed Changes

**Backend:**
1. Modify `/api/names/search` to sort by `weighted_count DESC` (most popular first)

**Frontend:**
1. Create `SearchAutocomplete` component with:
   - Debounced search (300ms)
   - Two sections in dropdown: **"Names"** and **"Countries"**
   - Names show: name, gender badge, origin
   - Countries show: flag emoji, name, count
   - Keyboard navigation support

2. Search behavior:
   - Names: API call to `/api/names/search` (limit 8)
   - Countries: Client-side filter on origins list (limit 5)
   - **Click name → navigate to `/name/[id]`** (new detail page)
   - Click country → navigate to `/explore/[origin]`

---

## Part 2: Name Detail Page (NEW)

### Route: `/name/[id]`

A dedicated page showing comprehensive name information:

```
┌─────────────────────────────────────────────────┐
│  ← Back                                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Emma                                      ♀️   │
│  ─────────────────────────────────────────────  │
│  Origin: English, German                        │
│                                                 │
│  Meaning                                        │
│  "Whole" or "universal"                         │
│                                                 │
│  Popularity                                     │
│  #3 in USA · #7 in UK · #12 in Italy           │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  ❤️ Like          │    ✕ Dismiss        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Similar Names                                  │
│  Emily · Ella · Emilia · Emmy                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Backend endpoint needed:**
- `GET /api/names/{id}` - Get single name with full details
- `GET /api/names/{id}/similar` - Get similar/related names (same group_id or phonetic)

---

## Part 3: Explore Page Redesign

### Current State
- Just a flat grid of countries

### Proposed Layout

```
┌─────────────────────────────────────────────────┐
│  [🔍 Search names or countries...            ]  │  ← Smart autocomplete
├─────────────────────────────────────────────────┤
│                                                 │
│  ⭐ Most Popular Names                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │Emma │ │Liam │ │Olivia│ │Noah │ │Ava  │  →   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Popular by Gender              [Boys] [Girls]  │  ← Tabs on mobile
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │Noah │ │Liam │ │Oliver│ │James│ │Leo  │  →   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  🌍 Explore by Region                           │
│  ┌──────────────────────────────────────────┐  │
│  │ 🇪🇺 Europe                            ▼  │  │  ← Expandable
│  ├──────────────────────────────────────────┤  │
│  │ 🇮🇹 Italy  🇬🇧 UK  🇫🇷 France  🇩🇪 Germany │  │  ← Revealed on expand
│  │ 🇪🇸 Spain  🇵🇹 Portugal  🇮🇪 Ireland ...  │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ 🌎 Americas                           ▶  │  │  ← Collapsed
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ 🌏 Asia & Oceania                     ▶  │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Backend (4 tasks)

1. **Modify `/api/names/search`**
   - Sort by `weighted_count DESC` instead of alphabetically
   - File: `backend/app/routers/names.py`

2. **Add `GET /api/names/popular`**
   - Parameters: `?gender=M|F|U&limit=10`
   - Returns top names globally by weighted_count
   - File: `backend/app/routers/names.py`

3. **Add `GET /api/names/{id}`**
   - Return single name with all details
   - File: `backend/app/routers/names.py`

4. **Add `GET /api/names/{id}/similar`**
   - Return names with same `group_id` or similar `phonetic_code`
   - File: `backend/app/routers/names.py`

### Frontend (8 tasks)

1. **Create `SearchAutocomplete.tsx`**
   - Debounced input
   - Dual-section dropdown (Names / Countries)
   - Keyboard navigation
   - File: `frontend/src/components/SearchAutocomplete.tsx`

2. **Create `PopularNames.tsx`**
   - Horizontal scrollable row of name chips
   - Click navigates to name detail page
   - File: `frontend/src/components/explore/PopularNames.tsx`

3. **Create `GenderTabs.tsx`**
   - Tab toggle between Boys/Girls
   - Shows popular names for selected gender
   - File: `frontend/src/components/explore/GenderTabs.tsx`

4. **Create `RegionAccordion.tsx`**
   - Expandable region sections
   - Shows countries grid when expanded
   - File: `frontend/src/components/explore/RegionAccordion.tsx`

5. **Create `regions.ts` data file**
   - Map origins to regions (Europe, Americas, Asia, etc.)
   - File: `frontend/src/lib/regions.ts`

6. **Create Name Detail Page**
   - Route: `/name/[id]/page.tsx`
   - Shows full name info, like/dismiss buttons, similar names
   - File: `frontend/src/app/name/[id]/page.tsx`

7. **Update Explore Page**
   - Replace current layout with new sections
   - File: `frontend/src/app/explore/page.tsx`

8. **Update API client**
   - Add `getPopularNames()`, `getName()`, `getSimilarNames()` methods
   - File: `frontend/src/lib/api.ts`

---

## File Summary

| File | Action |
|------|--------|
| `backend/app/routers/names.py` | Modify (add 3 endpoints, update 1) |
| `frontend/src/lib/api.ts` | Modify (add 3 methods) |
| `frontend/src/lib/regions.ts` | Create |
| `frontend/src/components/SearchAutocomplete.tsx` | Create |
| `frontend/src/components/explore/PopularNames.tsx` | Create |
| `frontend/src/components/explore/GenderTabs.tsx` | Create |
| `frontend/src/components/explore/RegionAccordion.tsx` | Create |
| `frontend/src/app/name/[id]/page.tsx` | Create |
| `frontend/src/app/explore/page.tsx` | Modify (new layout) |

---

## Regional Groupings

```typescript
export const REGIONS = {
  europe: {
    name: 'Europe',
    emoji: '🇪🇺',
    origins: ['italy', 'uk', 'france', 'germany', 'spain', 'portugal',
              'ireland', 'netherlands', 'belgium', 'sweden', 'norway',
              'denmark', 'finland', 'poland', 'austria', 'switzerland',
              'greece', 'czechia', 'hungary', 'romania', ...]
  },
  americas: {
    name: 'Americas',
    emoji: '🌎',
    origins: ['usa', 'mexico', 'brazil', 'argentina', 'canada',
              'colombia', 'chile', 'peru', 'venezuela', ...]
  },
  asia_oceania: {
    name: 'Asia & Oceania',
    emoji: '🌏',
    origins: ['japan', 'china', 'india', 'korea', 'vietnam',
              'thailand', 'indonesia', 'philippines', 'australia',
              'new_zealand', ...]
  },
  middle_east_africa: {
    name: 'Middle East & Africa',
    emoji: '🌍',
    origins: ['turkey', 'israel', 'iran', 'egypt', 'nigeria',
              'south_africa', 'kenya', 'morocco', ...]
  }
}
```

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Name click behavior | Navigate to dedicated `/name/[id]` page |
| Region click behavior | Expand inline to reveal countries |
| "Trending" terminology | Use "Most Popular Names" (weighted_count) |
| Mobile gender layout | Tabs (toggle between Boys/Girls) |