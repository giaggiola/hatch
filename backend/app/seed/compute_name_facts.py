"""
Compute name facts using Gemini 2.5 Flash API.

Features:
- Stores results in both CSV (backup) and DB
- Auto-resumes from CSV if interrupted
- Recovery mode to import CSV into DB

Run with:
    python -m app.seed.compute_name_facts              # Process names
    python -m app.seed.compute_name_facts --recover    # Import CSV to DB
    python -m app.seed.compute_name_facts --limit 100  # Process first N names
"""
import argparse
import asyncio
import csv
import json
import os
import sqlite3
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Paths
DB_PATH = Path(__file__).parent.parent.parent / "data" / "baby_names.db"
CSV_PATH = Path(__file__).parent.parent.parent / "data" / "name_facts.csv"
ERRORS_PATH = Path(__file__).parent.parent.parent / "data" / "name_facts_errors.csv"

# Config
CONCURRENCY = 10  # Parallel requests (reduced to avoid rate limits)
RATE_LIMIT_DELAY = 1.0  # Seconds between batches (increased for rate limiting)
DEFAULT_LIMIT = 100  # Default number of names to process

# JSON schema for structured output
NAME_FACTS_SCHEMA = {
    "type": "object",
    "properties": {
        "origin_language": {
            "type": "string",
            "description": "Linguistic/etymological origin (e.g., Hebrew, Latin, Old Germanic)"
        },
        "meaning": {
            "type": "string",
            "description": "The meaning or etymology of the name"
        },
        "nicknames": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Common diminutives or short forms"
        },
        "historical_figures": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"}
                },
                "required": ["name", "description"]
            },
            "description": "Notable real people (max 5)"
        },
        "fictional_characters": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "source": {"type": "string"},
                    "description": {"type": "string"}
                },
                "required": ["name", "source", "description"]
            },
            "description": "Notable fictional characters (max 5)"
        },
        "cultural_references": {
            "type": "object",
            "properties": {
                "religious": {"type": "string", "nullable": True},
                "mythological": {"type": "string", "nullable": True},
                "literary": {"type": "string", "nullable": True}
            },
            "description": "Cultural significance"
        }
    },
    "required": ["origin_language", "meaning", "nicknames", "historical_figures", "fictional_characters", "cultural_references"]
}

PROMPT_TEMPLATE = """For the name "{name}" (gender: {gender}), provide information in English:

- origin_language: Linguistic/etymological origin
- meaning: The meaning or etymology
- nicknames: Common diminutives or short forms
- historical_figures: Notable real people (max 5), each with name and one-liner description
- fictional_characters: Notable fictional characters from literature, film, TV, mythology, games (max 5), each with name, source, and one-liner description
- cultural_references: religious, mythological, and literary significance (use null if none)"""


def get_names_to_process(limit: Optional[int] = None) -> list:
    """Get names from DB that don't have facts yet."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    query = """
        SELECT n.id, n.name, n.gender
        FROM names n
        LEFT JOIN name_facts nf ON n.id = nf.name_id
        WHERE nf.id IS NULL
        ORDER BY n.name
    """
    if limit:
        query += f" LIMIT {limit}"

    cursor.execute(query)
    names = cursor.fetchall()
    conn.close()
    return names


def get_processed_from_csv() -> set:
    """Get set of name_ids already processed in CSV."""
    if not CSV_PATH.exists():
        return set()

    processed = set()
    with open(CSV_PATH, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            processed.add(row['name_id'])
    return processed


def init_csv():
    """Initialize CSV file with headers if it doesn't exist."""
    if not CSV_PATH.exists():
        with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'name_id', 'name', 'gender', 'origin_language', 'meaning',
                'nicknames', 'historical_figures', 'fictional_characters',
                'cultural_references', 'created_at'
            ])


def append_to_csv(name_id: str, name: str, gender: str, facts: dict):
    """Append a single result to CSV."""
    with open(CSV_PATH, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            name_id,
            name,
            gender,
            facts.get('origin_language', ''),
            facts.get('meaning', ''),
            json.dumps(facts.get('nicknames', [])),
            json.dumps(facts.get('historical_figures', [])),
            json.dumps(facts.get('fictional_characters', [])),
            json.dumps(facts.get('cultural_references', {})),
            datetime.now().isoformat()
        ])


def append_error(name_id: str, name: str, gender: str, error: str):
    """Log an error to the errors CSV."""
    if not ERRORS_PATH.exists():
        with open(ERRORS_PATH, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['name_id', 'name', 'gender', 'error', 'timestamp'])

    with open(ERRORS_PATH, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([name_id, name, gender, error, datetime.now().isoformat()])


def save_to_db(name_id: str, facts: dict):
    """Save facts to database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT OR REPLACE INTO name_facts
        (id, name_id, origin_language, meaning, nicknames, historical_figures,
         fictional_characters, cultural_references, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        str(uuid.uuid4()),
        name_id,
        facts.get('origin_language'),
        facts.get('meaning'),
        json.dumps(facts.get('nicknames', [])),
        json.dumps(facts.get('historical_figures', [])),
        json.dumps(facts.get('fictional_characters', [])),
        json.dumps(facts.get('cultural_references', {})),
        datetime.now().isoformat()
    ))

    conn.commit()
    conn.close()


async def fetch_name_facts(model, name: str, gender: str, semaphore: asyncio.Semaphore) -> dict:
    """Fetch facts for a single name using Gemini API."""
    async with semaphore:
        prompt = PROMPT_TEMPLATE.format(name=name, gender=gender)

        # Run in executor since genai is not async
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=NAME_FACTS_SCHEMA
                )
            )
        )

        return json.loads(response.text)


async def process_single_name(model, name_id: str, name: str, gender: str, semaphore: asyncio.Semaphore) -> tuple:
    """Process a single name and return result or error."""
    try:
        facts = await fetch_name_facts(model, name, gender, semaphore)
        return (name_id, name, gender, facts, None)
    except Exception as e:
        return (name_id, name, gender, None, str(e))


async def process_names(names: list, model) -> tuple:
    """Process a list of names concurrently in batches."""
    semaphore = asyncio.Semaphore(CONCURRENCY)
    processed = 0
    errors = 0

    total = len(names)
    start_time = time.time()

    # Process in batches of CONCURRENCY
    for batch_start in range(0, total, CONCURRENCY):
        batch_end = min(batch_start + CONCURRENCY, total)
        batch = names[batch_start:batch_end]

        # Create tasks for this batch
        tasks = [
            process_single_name(model, name_id, name, gender, semaphore)
            for name_id, name, gender in batch
        ]

        # Run batch concurrently
        results = await asyncio.gather(*tasks)

        # Process results
        for name_id, name, gender, facts, error in results:
            if error:
                append_error(name_id, name, gender, error)
                errors += 1
            else:
                # Save to CSV first (backup)
                append_to_csv(name_id, name, gender, facts)
                # Then save to DB
                save_to_db(name_id, facts)
                processed += 1

        # Progress update after each batch
        completed = batch_end
        elapsed = time.time() - start_time
        rate = completed / elapsed if elapsed > 0 else 0
        eta = (total - completed) / rate if rate > 0 else 0
        print(f"  Progress: {completed}/{total} ({completed * 100 // total}%) "
              f"| {processed} ok, {errors} errors "
              f"| {rate:.1f} names/sec | ETA: {eta:.0f}s")

        # Small delay between batches to respect rate limits
        if batch_end < total:
            await asyncio.sleep(RATE_LIMIT_DELAY)

    return processed, errors


def recover_from_csv():
    """Import all data from CSV into DB."""
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
            cursor.execute("SELECT id FROM name_facts WHERE name_id = ?", (row['name_id'],))
            if cursor.fetchone():
                skipped += 1
                continue

            cursor.execute("""
                INSERT INTO name_facts
                (id, name_id, origin_language, meaning, nicknames, historical_figures,
                 fictional_characters, cultural_references, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()),
                row['name_id'],
                row['origin_language'],
                row['meaning'],
                row['nicknames'],
                row['historical_figures'],
                row['fictional_characters'],
                row['cultural_references'],
                row['created_at']
            ))
            imported += 1

    conn.commit()
    conn.close()

    print(f"Recovery complete: {imported} imported, {skipped} skipped (already in DB)")


def main():
    parser = argparse.ArgumentParser(description='Compute name facts using Gemini API')
    parser.add_argument('--recover', action='store_true', help='Recover from CSV to DB')
    parser.add_argument('--limit', type=int, default=DEFAULT_LIMIT, help='Limit number of names to process')
    args = parser.parse_args()

    print("=" * 60)
    print("COMPUTE NAME FACTS")
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
        print("ERROR: GEMINI_API_KEY not found in environment")
        return

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    # Get names to process
    print(f"Fetching names to process (limit: {args.limit})...")
    all_names = get_names_to_process(args.limit)
    print(f"  Found {len(all_names)} names without facts")

    # Filter out already processed (from CSV)
    processed_ids = get_processed_from_csv()
    names_to_process = [(nid, n, g) for nid, n, g in all_names if nid not in processed_ids]
    print(f"  Already in CSV: {len(all_names) - len(names_to_process)}")
    print(f"  To process: {len(names_to_process)}")

    if not names_to_process:
        print("\nAll names already processed!")
        return

    # Initialize CSV
    init_csv()

    # Process names
    print(f"\nProcessing {len(names_to_process)} names with concurrency={CONCURRENCY}...")
    start_time = time.time()

    processed, errors = asyncio.run(process_names(names_to_process, model))

    elapsed = time.time() - start_time

    print()
    print("=" * 60)
    print("COMPLETE!")
    print(f"  Processed: {processed}")
    print(f"  Errors: {errors}")
    print(f"  Time: {elapsed:.1f}s ({len(names_to_process) / elapsed:.1f} names/sec)")
    print(f"  CSV: {CSV_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    main()
