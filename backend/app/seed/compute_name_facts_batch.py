"""
Compute name facts using Gemini Batch API (50% cheaper, async processing).

Commands:
    python -m app.seed.compute_name_facts_batch submit     # Generate JSONL & submit batch job
    python -m app.seed.compute_name_facts_batch status     # Check batch job status
    python -m app.seed.compute_name_facts_batch download   # Download results & import to DB
"""
import argparse
import csv
import json
import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Paths
DB_PATH = Path(__file__).parent.parent.parent / "data" / "baby_names.db"
CSV_PATH = Path(__file__).parent.parent.parent / "data" / "name_facts.csv"
JSONL_PATH = Path(__file__).parent.parent.parent / "data" / "name_facts_requests.jsonl"
BATCH_JOB_PATH = Path(__file__).parent.parent.parent / "data" / "batch_job_id.txt"

# Config
MODEL = "gemini-2.5-flash"

PROMPT_TEMPLATE = """For the name "{name}" (gender: {gender}), provide information in English:

- origin_language: Linguistic/etymological origin
- meaning: The meaning or etymology
- nicknames: Common diminutives or short forms
- historical_figures: Notable real people (max 5), each with name and one-liner description
- fictional_characters: Notable fictional characters from literature, film, TV, mythology, games (max 5), each with name, source, and one-liner description
- cultural_references: religious, mythological, and literary significance (use null if none)

Return as valid JSON."""


def get_names_to_process() -> list:
    """Get names from DB that don't have facts yet and aren't in CSV."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get names without facts in DB
    cursor.execute("""
        SELECT n.id, n.name, n.gender
        FROM names n
        LEFT JOIN name_facts nf ON n.id = nf.name_id
        WHERE nf.id IS NULL
        ORDER BY n.name
    """)
    names = cursor.fetchall()
    conn.close()

    # Filter out names already in CSV
    processed_ids = get_processed_from_csv()
    return [(nid, n, g) for nid, n, g in names if nid not in processed_ids]


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


def generate_jsonl(names: list):
    """Generate JSONL file for batch processing."""
    print(f"Generating JSONL with {len(names)} requests...")

    with open(JSONL_PATH, 'w', encoding='utf-8') as f:
        for name_id, name, gender in names:
            prompt = PROMPT_TEMPLATE.format(name=name, gender=gender)
            request = {
                "key": name_id,  # Use name_id as key to match results
                "request": {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "responseMimeType": "application/json"
                    }
                }
            }
            f.write(json.dumps(request) + "\n")

    print(f"  Created: {JSONL_PATH}")
    print(f"  Size: {JSONL_PATH.stat().st_size / 1024 / 1024:.2f} MB")


def submit_batch_job():
    """Submit batch job to Gemini."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found")
        return

    client = genai.Client(api_key=api_key)

    # Upload JSONL file
    print(f"Uploading {JSONL_PATH}...")
    uploaded_file = client.files.upload(
        file=JSONL_PATH,
        config=types.UploadFileConfig(mime_type="application/jsonl")
    )
    print(f"  Uploaded: {uploaded_file.name}")

    # Create batch job
    print(f"Creating batch job with model {MODEL}...")
    batch_job = client.batches.create(
        model=MODEL,
        src=uploaded_file.name,
        config=types.CreateBatchJobConfig(
            display_name=f"name-facts-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        )
    )

    # Save job ID
    with open(BATCH_JOB_PATH, 'w') as f:
        f.write(batch_job.name)

    print(f"  Batch job created: {batch_job.name}")
    print(f"  State: {batch_job.state}")
    print(f"  Job ID saved to: {BATCH_JOB_PATH}")
    print()
    print("Run 'python -m app.seed.compute_name_facts_batch status' to check progress")


def check_status():
    """Check batch job status."""
    if not BATCH_JOB_PATH.exists():
        print("No batch job found. Run 'submit' first.")
        return

    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    job_name = BATCH_JOB_PATH.read_text().strip()
    batch_job = client.batches.get(name=job_name)

    print(f"Batch Job: {batch_job.name}")
    print(f"State: {batch_job.state}")

    if hasattr(batch_job, 'create_time'):
        print(f"Created: {batch_job.create_time}")

    if batch_job.state.name == "JOB_STATE_SUCCEEDED":
        print()
        print("Job completed! Run 'python -m app.seed.compute_name_facts_batch download' to import results")
    elif batch_job.state.name == "JOB_STATE_FAILED":
        print(f"Job failed: {getattr(batch_job, 'error', 'Unknown error')}")


def download_results():
    """Download batch results and import to CSV/DB."""
    if not BATCH_JOB_PATH.exists():
        print("No batch job found. Run 'submit' first.")
        return

    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    job_name = BATCH_JOB_PATH.read_text().strip()
    batch_job = client.batches.get(name=job_name)

    if batch_job.state.name != "JOB_STATE_SUCCEEDED":
        print(f"Job not complete. State: {batch_job.state}")
        return

    # Get result file
    result_file_name = batch_job.dest.file_name
    print(f"Downloading results from {result_file_name}...")

    file_content_bytes = client.files.download(file=result_file_name)
    file_content = file_content_bytes.decode('utf-8')

    # Load name mapping from DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, gender FROM names")
    name_map = {row[0]: (row[1], row[2]) for row in cursor.fetchall()}

    # Process results
    processed = 0
    errors = 0

    # Initialize CSV if needed
    if not CSV_PATH.exists():
        with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'name_id', 'name', 'gender', 'origin_language', 'meaning',
                'nicknames', 'historical_figures', 'fictional_characters',
                'cultural_references', 'created_at'
            ])

    for line in file_content.splitlines():
        if not line.strip():
            continue

        try:
            result = json.loads(line)
            name_id = result.get('key')

            if name_id not in name_map:
                continue

            name, gender = name_map[name_id]

            # Check for error
            if 'error' in result:
                print(f"  Error for {name}: {result['error']}")
                errors += 1
                continue

            # Parse response
            response = result.get('response', {})
            candidates = response.get('candidates', [])

            if not candidates:
                errors += 1
                continue

            content = candidates[0].get('content', {})
            parts = content.get('parts', [])

            if not parts:
                errors += 1
                continue

            text = parts[0].get('text', '{}')
            facts = json.loads(text)

            # Save to CSV
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

            # Save to DB
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

            processed += 1

            if processed % 1000 == 0:
                print(f"  Processed {processed}...")
                conn.commit()

        except json.JSONDecodeError as e:
            errors += 1
        except Exception as e:
            errors += 1

    conn.commit()
    conn.close()

    print()
    print("=" * 60)
    print("IMPORT COMPLETE!")
    print(f"  Processed: {processed}")
    print(f"  Errors: {errors}")
    print(f"  CSV: {CSV_PATH}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description='Compute name facts using Gemini Batch API')
    parser.add_argument('command', choices=['submit', 'status', 'download'],
                        help='Command to run')
    args = parser.parse_args()

    print("=" * 60)
    print("COMPUTE NAME FACTS (BATCH API)")
    print("=" * 60)
    print(f"Model: {MODEL}")
    print(f"Database: {DB_PATH}")
    print()

    if args.command == 'submit':
        names = get_names_to_process()
        print(f"Names to process: {len(names)}")

        if not names:
            print("All names already processed!")
            return

        generate_jsonl(names)
        submit_batch_job()

    elif args.command == 'status':
        check_status()

    elif args.command == 'download':
        download_results()


if __name__ == "__main__":
    main()
