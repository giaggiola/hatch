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
    search: Optional[str] = None,
) -> List[Dict]:
    """Get all matched names for a couple with aggregated country data"""
    # Build search condition if provided
    search_condition = ""
    if search:
        search_condition = "AND n.name LIKE :search"

    # Find names where both users in couple liked, with popularity data
    query = text(f"""
        SELECT
            n.id,
            n.name,
            n.gender,
            n.meaning,
            n.length,
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
            {search_condition}
        GROUP BY n.id
        ORDER BY matched_at DESC
        LIMIT :limit OFFSET :offset
    """)

    params = {"couple_id": couple_id, "limit": limit, "offset": offset}
    if search:
        params["search"] = f"{search}%"

    result = await db.execute(query, params)

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
            "countries": countries,
            "popularity_rank": row.best_rank,
            "weighted_count": row.total_weight,
            "matched_at": row.matched_at,
        })
    return matches


async def get_close_calls(
    db: AsyncSession,
    couple_id: str,
    current_user_id: str,
    limit: int = 20,
    min_similarity: float = 0.75,
) -> List[Dict]:
    """Find close calls - names where partners liked SIMILAR (but not same) names.

    For example, if you liked "Maria" and partner liked "Maria del Carmen",
    these are similar names and count as a close call.

    Uses pre-computed similarities from name_similarities table.
    Searches bidirectionally to find all close calls regardless of direction.
    """
    # Find pairs where:
    # - User A liked name X
    # - User B liked name Y
    # - X and Y are similar (via name_similarities table)
    # - X and Y are different names
    # - Neither X nor Y is an exact match (both partners liked same name)
    # Search both directions: your_name→partner_name AND partner_name→your_name
    query = text("""
        WITH user_likes AS (
            SELECT name_id FROM swipes
            WHERE couple_id = :couple_id
              AND user_id = :current_user_id
              AND action = 'like'
        ),
        partner_likes AS (
            SELECT name_id FROM swipes
            WHERE couple_id = :couple_id
              AND user_id != :current_user_id
              AND action = 'like'
        ),
        exact_matches AS (
            -- Names that BOTH partners liked (these are full matches, not close calls)
            SELECT ul.name_id
            FROM user_likes ul
            INNER JOIN partner_likes pl ON ul.name_id = pl.name_id
        ),
        -- Direction 1: Your likes similar to partner's likes
        direction1 AS (
            SELECT
                ns.similarity,
                n1.id as your_name_id,
                n1.name as your_name,
                n1.gender as your_gender,
                n2.id as partner_name_id,
                n2.name as partner_name,
                n2.gender as partner_gender
            FROM name_similarities ns
            INNER JOIN user_likes ul ON ns.name_id = ul.name_id
            INNER JOIN partner_likes pl ON ns.similar_name_id = pl.name_id
            INNER JOIN names n1 ON ns.name_id = n1.id
            INNER JOIN names n2 ON ns.similar_name_id = n2.id
            WHERE ns.similarity >= :min_similarity
              AND ns.name_id != ns.similar_name_id
              AND ns.name_id NOT IN (SELECT name_id FROM exact_matches)
              AND ns.similar_name_id NOT IN (SELECT name_id FROM exact_matches)
        ),
        -- Direction 2: Partner's likes similar to your likes (reverse lookup)
        direction2 AS (
            SELECT
                ns.similarity,
                n1.id as your_name_id,
                n1.name as your_name,
                n1.gender as your_gender,
                n2.id as partner_name_id,
                n2.name as partner_name,
                n2.gender as partner_gender
            FROM name_similarities ns
            INNER JOIN partner_likes pl ON ns.name_id = pl.name_id
            INNER JOIN user_likes ul ON ns.similar_name_id = ul.name_id
            INNER JOIN names n1 ON ns.similar_name_id = n1.id
            INNER JOIN names n2 ON ns.name_id = n2.id
            WHERE ns.similarity >= :min_similarity
              AND ns.name_id != ns.similar_name_id
              AND ns.name_id NOT IN (SELECT name_id FROM exact_matches)
              AND ns.similar_name_id NOT IN (SELECT name_id FROM exact_matches)
        ),
        -- Combine both directions and dedupe by partner name
        combined AS (
            SELECT * FROM direction1
            UNION
            SELECT * FROM direction2
        )
        SELECT
            c.similarity,
            c.your_name_id,
            c.your_name,
            c.your_gender,
            c.partner_name_id,
            c.partner_name,
            c.partner_gender,
            GROUP_CONCAT(DISTINCT np.country_code) as partner_countries
        FROM combined c
        LEFT JOIN name_popularity np ON c.partner_name_id = np.name_id
        GROUP BY c.partner_name_id
        ORDER BY c.similarity DESC
        LIMIT :limit
    """)

    result = await db.execute(
        query,
        {
            "couple_id": couple_id,
            "current_user_id": current_user_id,
            "min_similarity": min_similarity,
            "limit": limit,
        }
    )

    rows = result.fetchall()
    close_calls = []
    for row in rows:
        partner_countries = row.partner_countries.split(',') if row.partner_countries else []
        close_calls.append({
            "similarity": row.similarity,
            "your_name": {
                "id": row.your_name_id,
                "name": row.your_name,
                "gender": row.your_gender,
            },
            "partner_name": {
                "id": row.partner_name_id,
                "name": row.partner_name,
                "gender": row.partner_gender,
                "countries": partner_countries,
            },
        })
    return close_calls
