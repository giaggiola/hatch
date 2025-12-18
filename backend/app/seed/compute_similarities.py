"""
Pre-compute similar names for all names in the database.

This script computes the top 20 similar names for each name using
phonetic and etymology embeddings, then stores them in the name_similarities table.

Usage:
    cd backend
    source venv/bin/activate
    python -m app.seed.compute_similarities
"""
import asyncio
import json
import uuid
from typing import Dict, List, Tuple
import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

# Same weights as similarity.py
PHONETIC_WEIGHT = 0.6
ETYMOLOGY_WEIGHT = 0.4
TOP_K = 20
MIN_SIMILARITY = 0.7  # Lower threshold for pre-computation
BATCH_SIZE = 100  # Insert in batches


def load_embeddings(rows: List) -> Tuple[Dict[str, np.ndarray], Dict[str, np.ndarray], Dict[str, Dict]]:
    """Parse embeddings from database rows."""
    phonetic_embeddings = {}
    etymology_embeddings = {}
    name_data = {}

    for row in rows:
        name_id, name, gender, phonetic_json, etymology_json = row
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


def compute_similarity(
    query_phonetic: np.ndarray | None,
    query_etymology: np.ndarray | None,
    target_phonetic: np.ndarray | None,
    target_etymology: np.ndarray | None,
) -> float:
    """Compute weighted similarity between two names."""
    total_weight = 0.0
    weighted_sim = 0.0

    if query_phonetic is not None and target_phonetic is not None:
        phonetic_sim = float(np.dot(
            query_phonetic / np.linalg.norm(query_phonetic),
            target_phonetic / np.linalg.norm(target_phonetic)
        ))
        weighted_sim += PHONETIC_WEIGHT * phonetic_sim
        total_weight += PHONETIC_WEIGHT

    if query_etymology is not None and target_etymology is not None:
        etymology_sim = float(np.dot(
            query_etymology / np.linalg.norm(query_etymology),
            target_etymology / np.linalg.norm(target_etymology)
        ))
        weighted_sim += ETYMOLOGY_WEIGHT * etymology_sim
        total_weight += ETYMOLOGY_WEIGHT

    if total_weight == 0:
        return 0.0

    return weighted_sim / total_weight


def find_top_similar(
    name: str,
    phonetic_embeddings: Dict[str, np.ndarray],
    etymology_embeddings: Dict[str, np.ndarray],
    name_data: Dict[str, Dict],
) -> List[Tuple[str, float]]:
    """Find top K similar names for a given name."""
    query_phonetic = phonetic_embeddings.get(name)
    query_etymology = etymology_embeddings.get(name)

    if query_phonetic is None and query_etymology is None:
        return []

    similarities = []
    for target_name in name_data:
        if target_name == name:
            continue

        sim = compute_similarity(
            query_phonetic,
            query_etymology,
            phonetic_embeddings.get(target_name),
            etymology_embeddings.get(target_name),
        )

        if sim >= MIN_SIMILARITY:
            similarities.append((target_name, sim))

    # Sort by similarity descending and take top K
    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:TOP_K]


async def main():
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Load all embeddings
        print("Loading embeddings...")
        result = await db.execute(text("""
            SELECT n.id, n.name, n.gender, nf.embedding_phonetic, nf.embedding_etymology
            FROM names n
            JOIN name_facts nf ON n.id = nf.name_id
            WHERE nf.embedding_phonetic IS NOT NULL OR nf.embedding_etymology IS NOT NULL
        """))
        rows = result.fetchall()

        phonetic, etymology, name_data = load_embeddings(rows)
        print(f"Loaded {len(name_data)} names with embeddings")

        # Clear existing similarities
        print("Clearing existing similarities...")
        await db.execute(text("DELETE FROM name_similarities"))
        await db.commit()

        # Compute similarities for each name
        print(f"Computing top {TOP_K} similar names for each name...")
        total_names = len(name_data)
        processed = 0
        batch = []

        for name in name_data:
            similar = find_top_similar(name, phonetic, etymology, name_data)

            source_id = name_data[name]['id']
            for rank, (similar_name, sim) in enumerate(similar, start=1):
                target_id = name_data[similar_name]['id']
                batch.append({
                    'id': str(uuid.uuid4()),
                    'name_id': source_id,
                    'similar_name_id': target_id,
                    'similarity': round(sim, 4),
                    'rank': rank,
                })

            processed += 1

            # Insert in batches
            if len(batch) >= BATCH_SIZE * TOP_K:
                await db.execute(
                    text("""
                        INSERT INTO name_similarities (id, name_id, similar_name_id, similarity, rank)
                        VALUES (:id, :name_id, :similar_name_id, :similarity, :rank)
                    """),
                    batch
                )
                await db.commit()
                batch = []

            if processed % 1000 == 0:
                print(f"  Processed {processed}/{total_names} names ({processed * 100 // total_names}%)")

        # Insert remaining batch
        if batch:
            await db.execute(
                text("""
                    INSERT INTO name_similarities (id, name_id, similar_name_id, similarity, rank)
                    VALUES (:id, :name_id, :similar_name_id, :similarity, :rank)
                """),
                batch
            )
            await db.commit()

        # Count total similarities
        count_result = await db.execute(text("SELECT COUNT(*) FROM name_similarities"))
        total = count_result.scalar()
        print(f"\nDone! Stored {total:,} similarity relationships")


if __name__ == "__main__":
    asyncio.run(main())
