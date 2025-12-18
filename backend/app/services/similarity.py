"""
Name similarity service using multi-aspect embedding vectors.

Uses phonetic and etymology embeddings from name_facts table for richer similarity.
Provides fast similarity lookups using numpy for vector operations.
Embeddings are loaded into memory on first use and cached.
Uses asyncio.to_thread to avoid blocking the event loop during heavy computations.
"""
import asyncio
import json
from typing import List, Dict, Optional, Tuple
import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Weights for combining embeddings (must sum to 1.0)
PHONETIC_WEIGHT = 0.6  # Sound/pronunciation similarity
ETYMOLOGY_WEIGHT = 0.4  # Meaning/origin similarity

# Cache for embeddings (loaded once, reused)
_phonetic_cache: Optional[Dict[str, np.ndarray]] = None
_etymology_cache: Optional[Dict[str, np.ndarray]] = None
_name_data_cache: Optional[Dict[str, Dict]] = None
_cache_lock = asyncio.Lock()


def _parse_embeddings_sync(rows: List) -> Tuple[Dict[str, np.ndarray], Dict[str, np.ndarray], Dict[str, Dict]]:
    """Parse multi-aspect embeddings from database rows (CPU-bound, runs in thread pool)."""
    phonetic_embeddings = {}
    etymology_embeddings = {}
    name_data = {}

    for row in rows:
        name_id, name, gender, phonetic_json, etymology_json = row
        # Only include names that have at least one embedding type
        if phonetic_json or etymology_json:
            if phonetic_json:
                phonetic_embeddings[name] = np.array(json.loads(phonetic_json), dtype=np.float32)
            if etymology_json:
                etymology_embeddings[name] = np.array(json.loads(etymology_json), dtype=np.float32)
            name_data[name] = {
                'id': name_id,
                'name': name,
                'gender': gender
            }

    return phonetic_embeddings, etymology_embeddings, name_data


async def _load_embeddings(db: AsyncSession) -> Tuple[Dict[str, np.ndarray], Dict[str, np.ndarray], Dict[str, Dict]]:
    """Load all embeddings into memory. Called once and cached."""
    global _phonetic_cache, _etymology_cache, _name_data_cache

    if _phonetic_cache is not None:
        return _phonetic_cache, _etymology_cache, _name_data_cache

    # Use lock to prevent concurrent loading
    async with _cache_lock:
        # Double-check after acquiring lock
        if _phonetic_cache is not None:
            return _phonetic_cache, _etymology_cache, _name_data_cache

        result = await db.execute(text("""
            SELECT n.id, n.name, n.gender, nf.embedding_phonetic, nf.embedding_etymology
            FROM names n
            JOIN name_facts nf ON n.id = nf.name_id
            WHERE nf.embedding_phonetic IS NOT NULL OR nf.embedding_etymology IS NOT NULL
        """))
        rows = result.fetchall()

        # Parse embeddings in thread pool to avoid blocking event loop
        phonetic, etymology, name_data = await asyncio.to_thread(_parse_embeddings_sync, rows)

        _phonetic_cache = phonetic
        _etymology_cache = etymology
        _name_data_cache = name_data

    return _phonetic_cache, _etymology_cache, _name_data_cache


def clear_cache():
    """Clear the embedding cache (call after data changes)."""
    global _phonetic_cache, _etymology_cache, _name_data_cache
    _phonetic_cache = None
    _etymology_cache = None
    _name_data_cache = None


def cosine_similarity_batch(query: np.ndarray, vectors: np.ndarray) -> np.ndarray:
    """Compute cosine similarity between query and all vectors."""
    # Normalize query
    query_norm = query / np.linalg.norm(query)
    # Normalize all vectors
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    vectors_norm = vectors / norms
    # Dot product gives cosine similarity
    return np.dot(vectors_norm, query_norm)


def _compute_similarities_sync(
    query_phonetic: Optional[np.ndarray],
    query_etymology: Optional[np.ndarray],
    phonetic_embeddings: Dict[str, np.ndarray],
    etymology_embeddings: Dict[str, np.ndarray],
    name_data: Dict[str, Dict],
    name: str,
    min_similarity: float,
    exclude_self: bool,
    gender: Optional[str],
    top_k: int
) -> List[Dict]:
    """Compute multi-aspect similarities synchronously (CPU-bound, runs in thread pool).

    Combines phonetic and etymology similarity using weighted average.
    If a name is missing one embedding type, uses only the available one.
    """
    results = []

    for target_name, data in name_data.items():
        if exclude_self and target_name == name:
            continue
        # Filter by gender if specified
        if gender and data['gender'] != gender:
            continue

        # Compute weighted similarity from available embeddings
        total_weight = 0.0
        weighted_sim = 0.0

        # Phonetic similarity
        if query_phonetic is not None and target_name in phonetic_embeddings:
            target_phonetic = phonetic_embeddings[target_name]
            phonetic_sim = float(np.dot(
                query_phonetic / np.linalg.norm(query_phonetic),
                target_phonetic / np.linalg.norm(target_phonetic)
            ))
            weighted_sim += PHONETIC_WEIGHT * phonetic_sim
            total_weight += PHONETIC_WEIGHT

        # Etymology similarity
        if query_etymology is not None and target_name in etymology_embeddings:
            target_etymology = etymology_embeddings[target_name]
            etymology_sim = float(np.dot(
                query_etymology / np.linalg.norm(query_etymology),
                target_etymology / np.linalg.norm(target_etymology)
            ))
            weighted_sim += ETYMOLOGY_WEIGHT * etymology_sim
            total_weight += ETYMOLOGY_WEIGHT

        # Skip if no embeddings matched
        if total_weight == 0:
            continue

        # Normalize by actual weights used
        final_sim = weighted_sim / total_weight

        if final_sim >= min_similarity:
            results.append({
                'name': target_name,
                'gender': data['gender'],
                'similarity': round(final_sim, 3)
            })

    # Sort by similarity descending
    results.sort(key=lambda x: x['similarity'], reverse=True)

    return results[:top_k]


async def find_similar_names(
    db: AsyncSession,
    name: str,
    top_k: int = 10,
    min_similarity: float = 0.84,
    exclude_self: bool = True,
    gender: Optional[str] = None
) -> List[Dict]:
    """
    Find the most similar names using pre-computed similarities from database.

    Falls back to on-the-fly computation if pre-computed data is not available.

    Args:
        db: Database session
        name: The name to find similarities for
        top_k: Maximum number of results to return
        min_similarity: Minimum similarity threshold
        exclude_self: Whether to exclude the exact same name
        gender: Optional gender filter (M, F, or U) - only return names with this gender

    Returns:
        List of dicts with 'name', 'gender', 'similarity' keys, sorted by similarity
    """
    # Try pre-computed similarities first (fast path)
    results = await _find_similar_precomputed(db, name, top_k, min_similarity, gender)
    if results is not None:
        return results

    # Fall back to on-the-fly computation
    return await _find_similar_compute(db, name, top_k, min_similarity, exclude_self, gender)


async def _find_similar_precomputed(
    db: AsyncSession,
    name: str,
    top_k: int,
    min_similarity: float,
    gender: Optional[str]
) -> Optional[List[Dict]]:
    """Look up pre-computed similar names from database."""
    # Build query with optional gender filter
    gender_filter = ""
    if gender:
        gender_filter = "AND n2.gender = :gender"

    query = text(f"""
        SELECT n2.name, n2.gender, ns.similarity
        FROM name_similarities ns
        JOIN names n1 ON ns.name_id = n1.id
        JOIN names n2 ON ns.similar_name_id = n2.id
        WHERE n1.name = :name
          AND ns.similarity >= :min_similarity
          {gender_filter}
        ORDER BY ns.rank
        LIMIT :limit
    """)

    params = {"name": name, "min_similarity": min_similarity, "limit": top_k}
    if gender:
        params["gender"] = gender

    result = await db.execute(query, params)
    rows = result.fetchall()

    # Return empty list if no pre-computed data
    # (avoid fallback to on-the-fly computation which loads ALL embeddings into memory)
    if not rows:
        return []

    return [
        {"name": row[0], "gender": row[1], "similarity": round(row[2], 3)}
        for row in rows
    ]


async def _find_similar_compute(
    db: AsyncSession,
    name: str,
    top_k: int,
    min_similarity: float,
    exclude_self: bool,
    gender: Optional[str]
) -> List[Dict]:
    """Compute similar names on-the-fly using embeddings (fallback)."""
    phonetic_embeddings, etymology_embeddings, name_data = await _load_embeddings(db)

    if name not in name_data:
        return []

    # Get query embeddings (may have one or both)
    query_phonetic = phonetic_embeddings.get(name)
    query_etymology = etymology_embeddings.get(name)

    # Need at least one embedding to compute similarity
    if query_phonetic is None and query_etymology is None:
        return []

    # Run similarity computation in thread pool to avoid blocking event loop
    results = await asyncio.to_thread(
        _compute_similarities_sync,
        query_phonetic,
        query_etymology,
        phonetic_embeddings,
        etymology_embeddings,
        name_data,
        name,
        min_similarity,
        exclude_self,
        gender,
        top_k
    )

    return results
