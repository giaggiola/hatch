"""
Name similarity service using embedding vectors.

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

# Cache for embeddings (loaded once, reused)
_embedding_cache: Optional[Dict[str, np.ndarray]] = None
_name_data_cache: Optional[Dict[str, Dict]] = None
_cache_lock = asyncio.Lock()


def _parse_embeddings_sync(rows: List) -> Tuple[Dict[str, np.ndarray], Dict[str, Dict]]:
    """Parse embeddings from database rows (CPU-bound, runs in thread pool)."""
    embeddings = {}
    name_data = {}

    for row in rows:
        name_id, name, gender, embedding_json = row
        if embedding_json:
            embedding = np.array(json.loads(embedding_json), dtype=np.float32)
            embeddings[name] = embedding
            name_data[name] = {
                'id': name_id,
                'name': name,
                'gender': gender
            }

    return embeddings, name_data


async def _load_embeddings(db: AsyncSession) -> Tuple[Dict[str, np.ndarray], Dict[str, Dict]]:
    """Load all embeddings into memory. Called once and cached."""
    global _embedding_cache, _name_data_cache

    if _embedding_cache is not None:
        return _embedding_cache, _name_data_cache

    # Use lock to prevent concurrent loading
    async with _cache_lock:
        # Double-check after acquiring lock
        if _embedding_cache is not None:
            return _embedding_cache, _name_data_cache

        result = await db.execute(text("""
            SELECT id, name, gender, embedding
            FROM names
            WHERE embedding IS NOT NULL
        """))
        rows = result.fetchall()

        # Parse embeddings in thread pool to avoid blocking event loop
        embeddings, name_data = await asyncio.to_thread(_parse_embeddings_sync, rows)

        _embedding_cache = embeddings
        _name_data_cache = name_data

    return embeddings, name_data


def clear_cache():
    """Clear the embedding cache (call after data changes)."""
    global _embedding_cache, _name_data_cache
    _embedding_cache = None
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
    query_embedding: np.ndarray,
    embeddings: Dict[str, np.ndarray],
    name_data: Dict[str, Dict],
    name: str,
    min_similarity: float,
    exclude_self: bool,
    gender: Optional[str],
    top_k: int
) -> List[Dict]:
    """Compute similarities synchronously (CPU-bound, runs in thread pool)."""
    # Build arrays for batch computation
    names_list = list(embeddings.keys())
    vectors = np.array([embeddings[n] for n in names_list])

    # Compute similarities
    similarities = cosine_similarity_batch(query_embedding, vectors)

    # Build results
    results = []
    for i, n in enumerate(names_list):
        if exclude_self and n == name:
            continue
        # Filter by gender if specified
        if gender and name_data[n]['gender'] != gender:
            continue
        sim = float(similarities[i])
        if sim >= min_similarity:
            results.append({
                'name': n,
                'gender': name_data[n]['gender'],
                'similarity': round(sim, 3)
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
    Find the most similar names to the given name.

    Args:
        db: Database session
        name: The name to find similarities for
        top_k: Maximum number of results to return
        min_similarity: Minimum similarity threshold (0.84 filters out loosely related names)
        exclude_self: Whether to exclude the exact same name
        gender: Optional gender filter (M, F, or U) - only return names with this gender

    Returns:
        List of dicts with 'name', 'gender', 'similarity' keys, sorted by similarity
    """
    embeddings, name_data = await _load_embeddings(db)

    if name not in embeddings:
        return []

    query_embedding = embeddings[name]

    # Run similarity computation in thread pool to avoid blocking event loop
    results = await asyncio.to_thread(
        _compute_similarities_sync,
        query_embedding,
        embeddings,
        name_data,
        name,
        min_similarity,
        exclude_self,
        gender,
        top_k
    )

    return results
