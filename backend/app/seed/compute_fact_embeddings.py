"""
Compute multi-aspect embeddings for names using Gemini API.

Creates three embeddings per name stored in name_facts:
- embedding_phonetic: name + nicknames (sound similarity)
- embedding_etymology: meaning + origin (semantic similarity)
- embedding_associations: historical + fictional + cultural (vibe similarity)

Run with:
    python -m app.seed.compute_fact_embeddings           # Process all
    python -m app.seed.compute_fact_embeddings --limit 100  # Test first 100
    python -m app.seed.compute_fact_embeddings --recover    # Import CSV to DB
"""
import argparse
import csv
import json
import os
import sqlite3
import time
from pathlib import Path

from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Paths
DB_PATH = Path(__file__).parent.parent.parent / "data" / "baby_names.db"
CSV_PATH = Path(__file__).parent.parent.parent / "data" / "fact_embeddings.csv"

# Config
BATCH_SIZE = 25  # Names per batch (smaller to avoid rate limits)
RATE_LIMIT_DELAY = 2.0  # Seconds between batches (longer for stability)


def get_names_to_process(limit: int = None) -> list:
    """Get names with facts but without embeddings."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    query = """
        SELECT
            nf.id,
            n.name,
            n.gender,
            nf.origin_language,
            nf.meaning,
            nf.nicknames,
            nf.historical_figures,
            nf.fictional_characters,
            nf.cultural_references
        FROM name_facts nf
        JOIN names n ON n.id = nf.name_id
        WHERE nf.embedding_phonetic IS NULL
        ORDER BY n.name
    """
    if limit:
        query += f" LIMIT {limit}"

    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()

    # Filter out names already in CSV
    processed_ids = get_processed_from_csv()
    return [row for row in rows if row[0] not in processed_ids]


def get_processed_from_csv() -> set:
    """Get set of fact_ids already processed in CSV."""
    if not CSV_PATH.exists():
        return set()
    processed = set()
    with open(CSV_PATH, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            processed.add(row['fact_id'])
    return processed


def init_csv():
    """Initialize CSV file with headers if it doesn't exist."""
    if not CSV_PATH.exists():
        with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'fact_id', 'name', 'embedding_phonetic',
                'embedding_etymology', 'embedding_associations'
            ])


def append_to_csv(fact_id: str, name: str, phonetic: list, etymology: list, associations: list):
    """Append embeddings to CSV file."""
    with open(CSV_PATH, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            fact_id,
            name,
            json.dumps(phonetic),
            json.dumps(etymology),
            json.dumps(associations)
        ])


def build_embedding_texts(row: tuple) -> dict:
    """Build the three embedding texts for a name."""
    (fact_id, name, gender, origin, meaning, nicknames_json,
     historical_json, fictional_json, cultural_json) = row

    # Parse JSON fields (handle "null" string -> None)
    nicknames = json.loads(nicknames_json) if nicknames_json else []
    nicknames = nicknames if nicknames else []

    historical = json.loads(historical_json) if historical_json else []
    historical = historical if historical else []

    fictional = json.loads(fictional_json) if fictional_json else []
    fictional = fictional if fictional else []

    cultural = json.loads(cultural_json) if cultural_json else {}
    cultural = cultural if cultural else {}

    # 1. Phonetic: name + nicknames
    if nicknames:
        phonetic_text = f"{name}. Nicknames: {', '.join(nicknames)}"
    else:
        phonetic_text = name

    # 2. Etymology: meaning + origin
    parts = []
    if meaning:
        parts.append(meaning)
    if origin:
        parts.append(f"Origin: {origin}")
    etymology_text = ". ".join(parts) if parts else name

    # 3. Associations: historical + fictional + cultural
    assoc_parts = []

    # Extract descriptions from historical figures
    for fig in historical[:3]:
        if isinstance(fig, dict) and fig.get('description'):
            assoc_parts.append(fig['description'])

    # Extract descriptions from fictional characters
    for char in fictional[:3]:
        if isinstance(char, dict) and char.get('description'):
            assoc_parts.append(char['description'])

    # Add cultural references
    if isinstance(cultural, dict):
        for key in ['religious', 'mythological', 'literary']:
            if cultural.get(key):
                assoc_parts.append(cultural[key])
    elif isinstance(cultural, str) and cultural:
        assoc_parts.append(cultural)

    associations_text = " ".join(assoc_parts) if assoc_parts else f"{name} associations"

    return {
        'fact_id': fact_id,
        'name': name,
        'phonetic': phonetic_text,
        'etymology': etymology_text,
        'associations': associations_text
    }


def compute_embeddings_batch(texts: list) -> list:
    """Compute embeddings for a batch of texts."""
    print(f"    Calling API with {len(texts)} texts...")
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=texts,
        task_type="semantic_similarity"
    )
    print(f"    API response type: {type(result)}, has embedding: {'embedding' in result if result else 'None'}")
    if result is None or 'embedding' not in result:
        raise ValueError(f"API returned invalid result: {result}")
    return result['embedding']


def save_embeddings_to_db(conn, fact_id: str, phonetic_emb: list, etymology_emb: list, associations_emb: list):
    """Save embeddings to database."""
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE name_facts
        SET embedding_phonetic = ?,
            embedding_etymology = ?,
            embedding_associations = ?
        WHERE id = ?
    """, (
        json.dumps(phonetic_emb),
        json.dumps(etymology_emb),
        json.dumps(associations_emb),
        fact_id
    ))


def recover_from_csv():
    """Import embeddings from CSV to DB."""
    if not CSV_PATH.exists():
        print("No CSV file found to recover from.")
        return

    print(f"Recovering from {CSV_PATH}...")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    imported = 0
    skipped = 0

    with open(CSV_PATH, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Check if already in DB
            cursor.execute(
                "SELECT id FROM name_facts WHERE id = ? AND embedding_phonetic IS NOT NULL",
                (row['fact_id'],)
            )
            if cursor.fetchone():
                skipped += 1
                continue

            cursor.execute("""
                UPDATE name_facts
                SET embedding_phonetic = ?,
                    embedding_etymology = ?,
                    embedding_associations = ?
                WHERE id = ?
            """, (
                row['embedding_phonetic'],
                row['embedding_etymology'],
                row['embedding_associations'],
                row['fact_id']
            ))
            imported += 1

            if imported % 1000 == 0:
                conn.commit()
                print(f"  Imported {imported}...")

    conn.commit()
    conn.close()

    print(f"Recovery complete: {imported} imported, {skipped} skipped")


def main():
    parser = argparse.ArgumentParser(description='Compute multi-aspect embeddings')
    parser.add_argument('--limit', type=int, help='Limit number of names to process')
    parser.add_argument('--recover', action='store_true', help='Recover from CSV to DB')
    args = parser.parse_args()

    print("=" * 60)
    print("COMPUTE FACT EMBEDDINGS")
    print("=" * 60)
    print(f"Database: {DB_PATH}")
    print(f"CSV backup: {CSV_PATH}")
    print()

    if args.recover:
        recover_from_csv()
        return

    # Configure Gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found")
        return
    genai.configure(api_key=api_key)

    # Get names to process
    print("Fetching names to process...")
    rows = get_names_to_process(args.limit)
    total = len(rows)
    print(f"  Found {total} names needing embeddings")

    if not rows:
        print("\nAll names already have embeddings!")
        return

    # Initialize CSV
    init_csv()

    # Process in batches
    conn = sqlite3.connect(DB_PATH)
    processed = 0
    errors = 0
    start_time = time.time()

    for batch_start in range(0, total, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, total)
        batch = rows[batch_start:batch_end]

        try:
            # Build texts for all names in batch
            print(f"  Building texts for batch {batch_start}-{batch_end}...")
            texts_data = []
            for row in batch:
                try:
                    td = build_embedding_texts(row)
                    texts_data.append(td)
                except Exception as build_e:
                    print(f"    Error building text for {row[1]}: {build_e}")
                    raise

            # Flatten all texts for batch embedding (3 per name)
            all_texts = []
            for td in texts_data:
                all_texts.extend([td['phonetic'], td['etymology'], td['associations']])
            print(f"    Built {len(all_texts)} texts for embedding")

            # Get all embeddings in one API call (with exponential backoff retry)
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    all_embeddings = compute_embeddings_batch(all_texts)
                    break
                except Exception as retry_e:
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt  # 1, 2, 4, 8, 16 seconds
                        print(f"    Retry {attempt + 1}/{max_retries} in {wait_time}s...")
                        time.sleep(wait_time)
                    else:
                        raise retry_e

            # Save embeddings (3 per name)
            for i, td in enumerate(texts_data):
                idx = i * 3
                phonetic_emb = all_embeddings[idx]
                etymology_emb = all_embeddings[idx + 1]
                associations_emb = all_embeddings[idx + 2]

                # Save to CSV first (backup)
                append_to_csv(td['fact_id'], td['name'], phonetic_emb, etymology_emb, associations_emb)

                # Then save to DB
                save_embeddings_to_db(conn, td['fact_id'], phonetic_emb, etymology_emb, associations_emb)
                processed += 1

            conn.commit()

        except Exception as e:
            print(f"  Error in batch {batch_start}-{batch_end}: {e}")
            errors += len(batch)
            time.sleep(2)

        # Progress update
        elapsed = time.time() - start_time
        rate = batch_end / elapsed if elapsed > 0 else 0
        eta = (total - batch_end) / rate if rate > 0 else 0
        print(f"  Progress: {batch_end}/{total} ({batch_end * 100 // total}%) "
              f"| {rate:.1f} names/sec | ETA: {eta:.0f}s")

        # Rate limit delay
        if batch_end < total:
            time.sleep(RATE_LIMIT_DELAY)

    conn.close()

    elapsed = time.time() - start_time
    print()
    print("=" * 60)
    print("COMPLETE!")
    print(f"  Processed: {processed}")
    print(f"  Errors: {errors}")
    print(f"  Time: {elapsed:.1f}s ({total / elapsed:.1f} names/sec)")
    print(f"  CSV backup: {CSV_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    main()
