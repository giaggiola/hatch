"""
Compute embeddings for all names using Gemini API.

Reads names from the database (after import_names.py has run) and saves embeddings
back to the database.

Run AFTER import_names.py.

Run with: python -m app.seed.compute_embeddings
"""
import json
import os
import sqlite3
import time
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment
load_dotenv()

# Paths
DB_PATH = Path(__file__).parent.parent.parent / "data" / "baby_names.db"

# Defaults
BATCH_SIZE = 100  # Names per API call (max 250, using 100 for safety)
RATE_LIMIT_DELAY = 0.1  # Seconds between batch API calls


def get_names_without_embeddings() -> list:
    """
    Get names from DB that don't have embeddings yet.
    Returns list of (name, id) tuples.
    """
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Get distinct names without embeddings (we'll update all rows with same name)
    cursor.execute("""
        SELECT DISTINCT name FROM names
        WHERE embedding IS NULL
        ORDER BY name
    """)
    names = [row[0] for row in cursor.fetchall()]
    conn.close()

    return names


def get_total_names_count() -> tuple:
    """Get total names and names with embeddings."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(DISTINCT name) FROM names")
    total = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(DISTINCT name) FROM names WHERE embedding IS NOT NULL")
    with_embeddings = cursor.fetchone()[0]
    conn.close()
    return total, with_embeddings


def compute_embeddings_batch(names: list) -> dict:
    """Get embeddings for a batch of names from Gemini."""
    contents = [f"The name {name}" for name in names]
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=contents,
        task_type="semantic_similarity"
    )
    # Result contains list of embeddings in same order
    return {name: emb for name, emb in zip(names, result['embedding'])}


def save_embeddings_to_db(embeddings: dict):
    """Save embeddings to database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for name, emb in embeddings.items():
        embedding_json = json.dumps(emb)
        # Update all rows with this name (there may be multiple with different genders)
        cursor.execute(
            "UPDATE names SET embedding = ? WHERE name = ?",
            (embedding_json, name)
        )
    conn.commit()
    conn.close()


def main():
    print("=" * 60)
    print("COMPUTING NAME EMBEDDINGS")
    print("=" * 60)
    print(f"Database: {DB_PATH}")
    print()

    # Configure Gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found in environment")
        return
    genai.configure(api_key=api_key)

    # Get stats
    total_names, with_embeddings = get_total_names_count()
    print(f"Total unique names in DB: {total_names}")
    print(f"Names with embeddings: {with_embeddings}")

    # Get names that need embeddings
    print("\nChecking for names without embeddings...")
    names_to_compute = get_names_without_embeddings()
    print(f"  Need to compute {len(names_to_compute)} new embeddings")

    if not names_to_compute:
        print("\nAll embeddings already computed!")
        return

    # Estimate time (batch processing)
    num_batches = (len(names_to_compute) + BATCH_SIZE - 1) // BATCH_SIZE
    est_seconds = num_batches * (RATE_LIMIT_DELAY + 0.5)  # ~0.5s per API call
    print(f"  Will process in {num_batches} batches")
    print(f"  Estimated time: ~{est_seconds / 60:.1f} minutes")

    # Compute embeddings in batches
    print(f"\nComputing embeddings...")
    errors = []

    for batch_idx in range(num_batches):
        start_idx = batch_idx * BATCH_SIZE
        end_idx = min(start_idx + BATCH_SIZE, len(names_to_compute))
        batch_names = names_to_compute[start_idx:end_idx]

        # Progress update
        pct = (batch_idx * 100) // num_batches
        print(f"  Batch {batch_idx + 1}/{num_batches} ({pct}%) - {len(batch_names)} names")

        try:
            batch_embeddings = compute_embeddings_batch(batch_names)
            save_embeddings_to_db(batch_embeddings)
        except Exception as e:
            errors.append((batch_names, str(e)))
            print(f"  Error in batch: {e}")

        # Rate limiting
        time.sleep(RATE_LIMIT_DELAY)

    # Get final stats
    total_names, with_embeddings = get_total_names_count()

    print()
    print("=" * 60)
    print("COMPLETE!")
    print(f"  Total names: {total_names}")
    print(f"  Names with embeddings: {with_embeddings}")
    print(f"  Errors: {len(errors)}")
    print("=" * 60)

    if errors:
        print(f"\nFailed names ({len(errors)}):")
        for name, err in errors[:10]:
            print(f"  {name}: {err}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")


if __name__ == "__main__":
    main()
