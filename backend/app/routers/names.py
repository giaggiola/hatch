from fastapi import APIRouter, Depends, Query, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, not_, func, or_, text
from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.name import NameResponse, NameWithSimilarResponse, NameFactsResponse, HistoricalFigure, FictionalCharacter, CulturalReferences, SimilarNameResponse
from app.models.name import Name
from app.models.name_fact import NameFact
from app.models.name_popularity import NamePopularity
from app.models.swipe import Swipe
from app.models.preference import UserPreference
from app.models.user import User
from app.services.name_service import origins_to_country_codes, country_code_to_origin
from app.services.similarity import find_similar_names
from app.rate_limiter import limiter, RATE_LIMIT_SEARCH
from typing import List, Dict, Optional
import json

router = APIRouter(prefix="/names", tags=["names"])

# Cache duration for static endpoints (in seconds)
CACHE_DURATION_STATIC = 3600  # 1 hour
CACHE_DURATION_SEMI_STATIC = 300  # 5 minutes


async def batch_fetch_similar_names_data(
    db: AsyncSession,
    similar_raw: List[Dict],
    user_country_codes: List[str] = None,
    max_results: int = 5
) -> List[SimilarNameResponse]:
    """Batch fetch similar names data in a single query instead of N+1.

    Args:
        db: Database session
        similar_raw: List of dicts with 'name', 'gender', 'similarity' from find_similar_names
        user_country_codes: Optional country codes to filter by
        max_results: Maximum number of results to return

    Returns:
        List of SimilarNameResponse objects
    """
    if not similar_raw:
        return []

    # Build conditions for all similar names at once
    name_gender_pairs = [(s['name'], s['gender']) for s in similar_raw[:max_results * 2]]  # Fetch extra in case some are filtered

    if not name_gender_pairs:
        return []

    # Create OR conditions for each (name, gender) pair
    conditions = [
        and_(Name.name == name, Name.gender == gender)
        for name, gender in name_gender_pairs
    ]

    query = (
        select(
            Name.id,
            Name.name,
            Name.gender,
            func.group_concat(NamePopularity.country_code).label('countries'),
            func.min(NamePopularity.popularity_rank).label('best_rank'),
            func.sum(NamePopularity.weighted_count).label('total_weight'),
        )
        .join(NamePopularity, Name.id == NamePopularity.name_id)
        .where(or_(*conditions))
        .group_by(Name.id)
    )

    if user_country_codes:
        query = query.where(NamePopularity.country_code.in_(user_country_codes))

    result = await db.execute(query)
    rows = result.fetchall()

    # Create a lookup map by (name, gender)
    data_map = {}
    for row in rows:
        key = (row.name, row.gender)
        data_map[key] = {
            'id': row[0],
            'name': row[1],
            'gender': row[2],
            'countries': row[3].split(',') if row[3] else [],
            'popularity_rank': row[4],
            'weighted_count': row[5],
        }

    # Build results in order, preserving similarity scores
    similar_list = []
    for sim in similar_raw:
        if len(similar_list) >= max_results:
            break
        key = (sim['name'], sim['gender'])
        if key in data_map:
            data = data_map[key]
            similar_list.append(SimilarNameResponse(
                id=data['id'],
                name=data['name'],
                gender=data['gender'],
                similarity=sim['similarity'],
                countries=data['countries'],
                popularity_rank=data['popularity_rank'],
                weighted_count=data['weighted_count'],
            ))

    return similar_list


def build_name_response(
    name: Name,
    countries: List[str],
    popularity_rank: Optional[int] = None,
    weighted_count: Optional[float] = None
) -> NameResponse:
    """Build a NameResponse from a Name model with aggregated stats."""
    return NameResponse(
        id=name.id,
        name=name.name,
        gender=name.gender,
        meaning=name.meaning,
        length=name.length,
        countries=countries,
        popularity_rank=popularity_rank,
        weighted_count=weighted_count,
    )


@router.get("", response_model=list[NameResponse])
async def get_names(
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get next batch of individual names to swipe (legacy endpoint)"""
    # Get user preferences
    pref_result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    preferences = pref_result.scalar_one_or_none()

    # Get IDs of names already swiped by this user
    swiped_result = await db.execute(
        select(Swipe.name_id).where(Swipe.user_id == current_user.id)
    )
    swiped_ids = [row[0] for row in swiped_result.fetchall() if row[0]]

    # Parse preferences
    user_country_codes = []
    user_genders = []
    starting_letters = []
    max_length = None

    if preferences:
        origins = json.loads(preferences.origins) if preferences.origins else []
        user_country_codes = origins_to_country_codes(origins)
        user_genders = json.loads(preferences.genders) if preferences.genders else []
        starting_letters = json.loads(preferences.starting_letters) if preferences.starting_letters else []
        max_length = preferences.max_length

    # Build query: join names with popularity, filter by country codes
    # Aggregate stats per name
    query = (
        select(
            Name,
            func.group_concat(NamePopularity.country_code).label('countries'),
            func.min(NamePopularity.popularity_rank).label('best_rank'),
            func.sum(NamePopularity.weighted_count).label('total_weight'),
        )
        .join(NamePopularity, Name.id == NamePopularity.name_id)
        .group_by(Name.id)
    )

    # Filter by user's selected countries
    if user_country_codes:
        query = query.where(NamePopularity.country_code.in_(user_country_codes))

    # Exclude already swiped names
    if swiped_ids:
        query = query.where(not_(Name.id.in_(swiped_ids)))

    # Apply preference filters
    if user_genders:
        query = query.where(Name.gender.in_(user_genders))

    if starting_letters:
        letter_conditions = [Name.name.ilike(f"{letter}%") for letter in starting_letters]
        query = query.where(or_(*letter_conditions))

    if max_length:
        query = query.where(Name.length <= max_length)

    # Order by total weighted count and limit
    query = query.order_by(text('total_weight DESC NULLS LAST')).limit(limit)

    result = await db.execute(query)
    rows = result.fetchall()

    names = []
    for row in rows:
        name = row[0]
        countries = row[1].split(',') if row[1] else []
        names.append(build_name_response(name, countries, row[2], row[3]))

    return names


@router.get("/swipe", response_model=list[NameWithSimilarResponse])
async def get_names_for_swiping(
    limit: int = Query(default=10, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get names for swiping with similar variants computed on-the-fly.

    Returns popular names matching user preferences, each with up to 5 similar variants.
    Uses batch queries to avoid N+1 performance issues.
    """
    # Get user preferences
    pref_result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    preferences = pref_result.scalar_one_or_none()

    # Get all name_ids already swiped by this user
    swiped_result = await db.execute(
        select(Swipe.name_id).where(Swipe.user_id == current_user.id)
    )
    swiped_name_ids = {row[0] for row in swiped_result.fetchall()}

    # Parse user preferences
    user_country_codes = []
    user_genders = []
    starting_letters = []
    max_length = None

    if preferences:
        origins = json.loads(preferences.origins) if preferences.origins else []
        user_country_codes = origins_to_country_codes(origins)
        user_genders = json.loads(preferences.genders) if preferences.genders else []
        starting_letters = json.loads(preferences.starting_letters) if preferences.starting_letters else []
        max_length = preferences.max_length

    # Find most popular names matching preferences
    name_query = (
        select(
            Name,
            func.group_concat(NamePopularity.country_code).label('countries'),
            func.min(NamePopularity.popularity_rank).label('best_rank'),
            func.sum(NamePopularity.weighted_count).label('total_weight'),
        )
        .join(NamePopularity, Name.id == NamePopularity.name_id)
        .group_by(Name.id)
    )

    # Filter by user's selected countries
    if user_country_codes:
        name_query = name_query.where(NamePopularity.country_code.in_(user_country_codes))

    # Exclude already swiped names
    if swiped_name_ids:
        name_query = name_query.where(not_(Name.id.in_(swiped_name_ids)))

    # Apply preference filters
    if user_genders:
        name_query = name_query.where(Name.gender.in_(user_genders))

    if starting_letters:
        letter_conditions = [Name.name.ilike(f"{letter}%") for letter in starting_letters]
        name_query = name_query.where(or_(*letter_conditions))

    if max_length:
        name_query = name_query.where(Name.length <= max_length)

    # Order by popularity and limit
    name_query = name_query.order_by(text('total_weight DESC NULLS LAST')).limit(limit)

    result = await db.execute(name_query)
    popular_names_data = result.fetchall()

    # Build response with similar variants using batch queries
    responses = []
    for row in popular_names_data:
        name = row[0]
        countries = row[1].split(',') if row[1] else []
        best_rank = row[2]
        total_weight = row[3]

        # Get similar names for this name (same gender or unisex)
        similar_raw = await find_similar_names(
            db,
            name=name.name,
            top_k=10,  # Fetch more to filter by country
            exclude_self=True,
            gender=name.gender  # Same gender filter
        )

        # Use batch function to fetch all similar names data in one query
        similar_list = await batch_fetch_similar_names_data(
            db,
            similar_raw,
            user_country_codes=user_country_codes if user_country_codes else None,
            max_results=5
        )

        responses.append(NameWithSimilarResponse(
            id=name.id,
            name=name.name,
            gender=name.gender,
            meaning=name.meaning,
            length=name.length,
            countries=countries,
            popularity_rank=best_rank,
            weighted_count=total_weight,
            similar=similar_list,
        ))

    return responses


@router.get("/countries")
async def get_available_countries(
    db: AsyncSession = Depends(get_db),
):
    """Get all available countries with name counts."""
    result = await db.execute(
        select(
            NamePopularity.country_code,
            func.count(func.distinct(NamePopularity.name_id)).label('count')
        )
        .group_by(NamePopularity.country_code)
        .order_by(func.count(func.distinct(NamePopularity.name_id)).desc())
    )

    countries = [
        {"code": row[0], "name": country_code_to_origin(row[0]), "count": row[1]}
        for row in result.fetchall()
    ]
    # Add cache headers for static data
    return JSONResponse(
        content=countries,
        headers={"Cache-Control": f"public, max-age={CACHE_DURATION_STATIC}"}
    )


@router.get("/origins")
async def get_available_origins(
    db: AsyncSession = Depends(get_db),
):
    """Get all available origins (countries as readable names) with name counts."""
    result = await db.execute(
        select(
            NamePopularity.country_code,
            func.count(func.distinct(NamePopularity.name_id)).label('count')
        )
        .group_by(NamePopularity.country_code)
        .order_by(func.count(func.distinct(NamePopularity.name_id)).desc())
    )

    # Convert country codes to origin names for backwards compatibility
    origins = [
        {"name": country_code_to_origin(row[0]), "count": row[1]}
        for row in result.fetchall()
    ]
    # Add cache headers for static data
    return JSONResponse(
        content=origins,
        headers={"Cache-Control": f"public, max-age={CACHE_DURATION_STATIC}"}
    )


@router.get("/search")
@limiter.limit(RATE_LIMIT_SEARCH)
async def search_names(
    request: Request,  # Required for rate limiter
    q: str = Query(..., min_length=1, max_length=50),
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Search names by prefix (autocomplete), sorted by popularity."""
    query = (
        select(
            Name,
            func.group_concat(NamePopularity.country_code).label('countries'),
            func.min(NamePopularity.popularity_rank).label('best_rank'),
            func.sum(NamePopularity.weighted_count).label('total_weight'),
        )
        .join(NamePopularity, Name.id == NamePopularity.name_id)
        .where(Name.name.ilike(f"{q}%"))
        .group_by(Name.id)
        .order_by(text('total_weight DESC NULLS LAST'))
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.fetchall()

    names = []
    for row in rows:
        name = row[0]
        countries = row[1].split(',') if row[1] else []
        names.append(build_name_response(name, countries, row[2], row[3]))

    return names


@router.get("/popular")
async def get_popular_names(
    gender: str = Query(default=None, description="Filter by gender (M, F, or U)"),
    limit: int = Query(default=10, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get most popular names globally, optionally filtered by gender."""
    query = (
        select(
            Name,
            func.group_concat(NamePopularity.country_code).label('countries'),
            func.min(NamePopularity.popularity_rank).label('best_rank'),
            func.sum(NamePopularity.weighted_count).label('total_weight'),
        )
        .join(NamePopularity, Name.id == NamePopularity.name_id)
        .group_by(Name.id)
    )

    if gender:
        query = query.where(Name.gender == gender)

    query = query.order_by(text('total_weight DESC NULLS LAST')).limit(limit)

    result = await db.execute(query)
    rows = result.fetchall()

    names = []
    for row in rows:
        name = row[0]
        countries = row[1].split(',') if row[1] else []
        names.append(build_name_response(name, countries, row[2], row[3]))

    return names


@router.get("/by-origin/{origin}")
async def get_names_by_origin(
    origin: str,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
):
    """Get names by origin/country."""
    from app.services.name_service import origin_to_country_code

    country_code = origin_to_country_code(origin.lower())
    if not country_code:
        # Try treating it as a country code directly
        country_code = origin.upper()

    query = (
        select(
            Name,
            func.group_concat(NamePopularity.country_code).label('countries'),
            NamePopularity.popularity_rank.label('rank'),
            NamePopularity.weighted_count.label('weight'),
        )
        .join(NamePopularity, Name.id == NamePopularity.name_id)
        .where(NamePopularity.country_code == country_code)
        .group_by(Name.id)
        .order_by(NamePopularity.popularity_rank.asc().nullslast())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.fetchall()

    names = []
    for row in rows:
        name = row[0]
        countries = [country_code]  # We filtered by this country
        names.append(build_name_response(name, countries, row[2], row[3]))

    return names


@router.get("/{name_id}/facts", response_model=NameFactsResponse)
async def get_name_facts(
    name_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get enriched facts for a name (origin, meaning, nicknames, famous people, etc.)."""
    # First verify the name exists
    name_result = await db.execute(select(Name).where(Name.id == name_id))
    name = name_result.scalar_one_or_none()
    if not name:
        raise HTTPException(status_code=404, detail="Name not found")

    # Get the facts for this name
    facts_result = await db.execute(
        select(NameFact).where(NameFact.name_id == name_id)
    )
    facts = facts_result.scalar_one_or_none()

    if not facts:
        # Return empty facts if none exist
        return NameFactsResponse()

    # Parse JSON fields (handle potential double-encoding)
    nicknames = json.loads(facts.nicknames) if facts.nicknames else []
    historical_figures_raw = json.loads(facts.historical_figures) if facts.historical_figures else []
    fictional_characters_raw = json.loads(facts.fictional_characters) if facts.fictional_characters else []
    cultural_references_raw = json.loads(facts.cultural_references) if facts.cultural_references else {}
    # Handle double-encoded JSON or non-dict values
    if isinstance(cultural_references_raw, str):
        try:
            cultural_references_raw = json.loads(cultural_references_raw)
        except json.JSONDecodeError:
            cultural_references_raw = {}
    if not isinstance(cultural_references_raw, dict):
        cultural_references_raw = {}

    # Build response with parsed data
    return NameFactsResponse(
        origin_language=facts.origin_language,
        meaning=facts.meaning,
        nicknames=nicknames,
        historical_figures=[
            HistoricalFigure(name=f.get('name', ''), description=f.get('description', ''))
            for f in historical_figures_raw if f.get('name')
        ],
        fictional_characters=[
            FictionalCharacter(
                name=f.get('name', ''),
                source=f.get('source', ''),
                description=f.get('description', '')
            )
            for f in fictional_characters_raw if f.get('name')
        ],
        cultural_references=CulturalReferences(
            religious=cultural_references_raw.get('religious'),
            mythological=cultural_references_raw.get('mythological'),
            literary=cultural_references_raw.get('literary'),
        ) if cultural_references_raw else None,
    )


@router.get("/{name_id}/popularity-by-region")
async def get_name_popularity_by_region(
    name_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get popularity data for a name across all regions, ranked by popularity."""
    # Get all popularity entries for this name
    query = (
        select(NamePopularity)
        .where(NamePopularity.name_id == name_id)
        .order_by(NamePopularity.popularity_rank.asc().nullslast())
    )

    result = await db.execute(query)
    popularity_entries = result.scalars().all()

    if not popularity_entries:
        return []

    # Batch fetch max ranks for all countries at once (fixes N+1)
    country_codes = [entry.country_code for entry in popularity_entries]
    max_ranks_query = (
        select(
            NamePopularity.country_code,
            func.max(NamePopularity.popularity_rank).label('max_rank')
        )
        .where(NamePopularity.country_code.in_(country_codes))
        .group_by(NamePopularity.country_code)
    )
    max_ranks_result = await db.execute(max_ranks_query)
    max_ranks_map = {row[0]: row[1] or 1 for row in max_ranks_result.fetchall()}

    # Build response using the cached max ranks
    regions_data = []
    for entry in popularity_entries:
        max_rank = max_ranks_map.get(entry.country_code, 1)

        # Calculate percentile (top X%)
        if entry.popularity_rank and max_rank > 0:
            percentile = (entry.popularity_rank / max_rank) * 100
        else:
            percentile = None

        regions_data.append({
            "country_code": entry.country_code,
            "country_name": country_code_to_origin(entry.country_code),
            "popularity_rank": entry.popularity_rank,
            "percentile": round(percentile, 1) if percentile else None,
            "weighted_count": entry.weighted_count,
        })

    return regions_data


@router.get("/{name_id}", response_model=NameResponse)
async def get_name_by_id(
    name_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific name by ID with all its popularity data."""
    query = (
        select(
            Name,
            func.group_concat(NamePopularity.country_code).label('countries'),
            func.min(NamePopularity.popularity_rank).label('best_rank'),
            func.sum(NamePopularity.weighted_count).label('total_weight'),
        )
        .outerjoin(NamePopularity, Name.id == NamePopularity.name_id)
        .where(Name.id == name_id)
        .group_by(Name.id)
    )

    result = await db.execute(query)
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Name not found")

    name = row[0]
    countries = row[1].split(',') if row[1] else []
    response = build_name_response(name, countries, row[2], row[3])

    # Cache for 20 minutes - name data rarely changes
    return JSONResponse(
        content=response.model_dump(),
        headers={"Cache-Control": "public, max-age=1200"}
    )


@router.get("/{name_id}/detail", response_model=NameWithSimilarResponse)
async def get_name_detail_with_similar(
    name_id: str,
    limit: int = Query(default=10, le=20),
    min_similarity: float = Query(default=0.84, ge=0.5, le=1.0),
    db: AsyncSession = Depends(get_db),
):
    """Get a name with similar variants for the detail/explore page.

    This is used when clicking "explore more" on a name card.
    Returns the name with all its details plus similar name variants.
    Uses batch queries to avoid N+1 performance issues.
    """
    # Get the main name with stats
    query = (
        select(
            Name,
            func.group_concat(NamePopularity.country_code).label('countries'),
            func.min(NamePopularity.popularity_rank).label('best_rank'),
            func.sum(NamePopularity.weighted_count).label('total_weight'),
        )
        .outerjoin(NamePopularity, Name.id == NamePopularity.name_id)
        .where(Name.id == name_id)
        .group_by(Name.id)
    )

    result = await db.execute(query)
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Name not found")

    name = row[0]
    countries = row[1].split(',') if row[1] else []
    best_rank = row[2]
    total_weight = row[3]

    # Get similar names
    similar_raw = await find_similar_names(
        db,
        name=name.name,
        top_k=limit,
        min_similarity=min_similarity,
        exclude_self=True
    )

    # Use batch function to fetch all similar names data in one query
    similar_list = await batch_fetch_similar_names_data(
        db,
        similar_raw,
        max_results=limit
    )

    return NameWithSimilarResponse(
        id=name.id,
        name=name.name,
        gender=name.gender,
        meaning=name.meaning,
        length=name.length,
        countries=countries,
        popularity_rank=best_rank,
        weighted_count=total_weight,
        similar=similar_list,
    )


@router.get("/{name_id}/similar")
async def get_similar_names_endpoint(
    name_id: str,
    limit: int = Query(default=10, le=20),
    min_similarity: float = Query(default=0.84, ge=0.5, le=1.0),
    gender: Optional[str] = Query(default=None, description="Filter by gender (M, F, U). Use 'same' to match the source name's gender."),
    db: AsyncSession = Depends(get_db),
):
    """Get similar names using embedding similarity (computed on-the-fly).

    Uses batch queries to avoid N+1 performance issues.
    """
    # First get the target name
    result = await db.execute(select(Name).where(Name.id == name_id))
    target_name = result.scalar_one_or_none()

    if not target_name:
        raise HTTPException(status_code=404, detail="Name not found")

    # Handle 'same' gender filter - use the source name's gender
    gender_filter = None
    if gender == 'same':
        gender_filter = target_name.gender
    elif gender in ('M', 'F', 'U'):
        gender_filter = gender

    # Use embedding similarity service
    similar = await find_similar_names(
        db,
        name=target_name.name,
        top_k=limit,
        min_similarity=min_similarity,
        exclude_self=True,
        gender=gender_filter
    )

    # Use batch function to fetch all similar names data in one query
    similar_list = await batch_fetch_similar_names_data(
        db,
        similar,
        max_results=limit
    )

    # Convert to dict format with similarity scores
    similar_responses = [
        {
            **{
                'id': s.id,
                'name': s.name,
                'gender': s.gender,
                'countries': s.countries,
                'popularity_rank': s.popularity_rank,
                'weighted_count': s.weighted_count,
            },
            'similarity': s.similarity,
        }
        for s in similar_list
    ]

    return similar_responses
