from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, text
from app.models.swipe import Swipe
from app.models.name import Name
from app.models.name_popularity import NamePopularity
from typing import Optional, List, Dict


async def check_for_match(
    db: AsyncSession,
    couple_id: str,
    name_id: str,
    current_user_id: str,
) -> bool:
    """Check if both partners have liked the same name.

    Uses COUNT(DISTINCT user_id) for efficiency instead of fetching all rows.
    """
    result = await db.execute(
        select(func.count(func.distinct(Swipe.user_id))).where(
            and_(
                Swipe.couple_id == couple_id,
                Swipe.name_id == name_id,
                Swipe.action == "like",
            )
        )
    )
    distinct_user_count = result.scalar() or 0
    return distinct_user_count >= 2


async def get_matches(
    db: AsyncSession,
    couple_id: str,
    limit: int = 50,
    offset: int = 0,
) -> List[Dict]:
    """Get all matched names for a couple with aggregated country data"""
    # Find names where both users in couple liked, with popularity data
    query = text("""
        SELECT
            n.id,
            n.name,
            n.gender,
            n.meaning,
            n.length,
            n.group_id,
            n.is_primary,
            GROUP_CONCAT(DISTINCT np.country_code) as countries,
            MIN(np.popularity_rank) as best_rank,
            SUM(np.weighted_count) as total_weight,
            MAX(s1.created_at) as matched_at
        FROM names n
        JOIN swipes s1 ON n.id = s1.name_id
        JOIN swipes s2 ON n.id = s2.name_id
            AND s1.couple_id = s2.couple_id
            AND s1.user_id != s2.user_id
        LEFT JOIN name_popularity np ON n.id = np.name_id
        WHERE s1.couple_id = :couple_id
            AND s1.action = 'like'
            AND s2.action = 'like'
        GROUP BY n.id
        ORDER BY matched_at DESC
        LIMIT :limit OFFSET :offset
    """)

    result = await db.execute(
        query,
        {"couple_id": couple_id, "limit": limit, "offset": offset}
    )

    rows = result.fetchall()
    matches = []
    for row in rows:
        countries = row.countries.split(',') if row.countries else []
        matches.append({
            "id": row.id,
            "name": row.name,
            "gender": row.gender,
            "meaning": row.meaning,
            "length": row.length,
            "group_id": row.group_id,
            "is_primary": row.is_primary,
            "countries": countries,
            "popularity_rank": row.best_rank,
            "weighted_count": row.total_weight,
            "matched_at": row.matched_at,
        })
    return matches
