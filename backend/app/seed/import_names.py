"""
Import names from merged CSVs into the database.
Takes top N names per country.

Run with: python -m app.seed.import_names [top_n_per_country]
"""
import asyncio
import csv
import uuid
from collections import defaultdict
from pathlib import Path
from sqlalchemy import text
from app.database import async_session
from app.models.name import Name
from app.models.name_popularity import NamePopularity

# Paths to merged CSVs
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data" / "merged"
NAMES_CSV = DATA_DIR / "merged_names.csv"
POPULARITY_CSV = DATA_DIR / "merged_name_popularity.csv"


def is_valid_name(name: str) -> bool:
    """Check if a name is valid (not garbage data)."""
    if not name or len(name) < 2:
        return False
    # Filter out names that are mostly punctuation/dashes
    alpha_chars = sum(1 for c in name if c.isalpha())
    if alpha_chars < len(name) * 0.5:
        return False
    return True


async def import_names(top_n_per_country: int = 500, clear_existing: bool = True):
    """
    Import names and popularity data from CSVs.

    Args:
        top_n_per_country: Number of top names to import per country
        clear_existing: Whether to clear existing data first
    """
    print(f"Importing top {top_n_per_country} names per country")
    print(f"Names CSV: {NAMES_CSV}")
    print(f"Popularity CSV: {POPULARITY_CSV}")

    if not NAMES_CSV.exists():
        print(f"ERROR: Names CSV not found at {NAMES_CSV}")
        return

    if not POPULARITY_CSV.exists():
        print(f"ERROR: Popularity CSV not found at {POPULARITY_CSV}")
        return

    # Step 1: Read popularity data and filter to top N per country
    print("\nReading popularity data...")
    popularity_by_country = defaultdict(list)

    with open(POPULARITY_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not is_valid_name(row['name']):
                continue
            popularity_by_country[row['country']].append({
                'name': row['name'],
                'gender': row['gender'],
                'country': row['country'],
                'popularity_rank': int(row['popularity_rank']),
                'weighted_count': float(row['weighted_count']) if row.get('weighted_count') else None,
                'total_count': int(row['total_count']) if row.get('total_count') else None,
            })

    print(f"Found {len(popularity_by_country)} countries")

    # Take top N per country
    selected_popularity = []
    for country, entries in popularity_by_country.items():
        sorted_entries = sorted(entries, key=lambda x: x['popularity_rank'])
        selected_popularity.extend(sorted_entries[:top_n_per_country])

    print(f"Selected {len(selected_popularity)} popularity entries")

    # Step 2: Build unique names set from selected popularity
    # A name is identified by (name, gender)
    unique_names = {}  # (name, gender) -> name_id
    for entry in selected_popularity:
        key = (entry['name'], entry['gender'])
        if key not in unique_names:
            unique_names[key] = str(uuid.uuid4())

    print(f"Unique (name, gender) pairs: {len(unique_names)}")

    # Step 3: Import into database
    async with async_session() as session:
        if clear_existing:
            print("\nClearing existing data...")
            await session.execute(text("DELETE FROM swipes"))
            await session.execute(text("DELETE FROM name_popularity"))
            await session.execute(text("DELETE FROM names"))
            await session.commit()
            print("Cleared existing data")

        # Insert names
        print("\nInserting names...")
        batch_size = 1000
        name_items = list(unique_names.items())

        for i in range(0, len(name_items), batch_size):
            batch = name_items[i:i + batch_size]

            for (name_str, gender), name_id in batch:
                name = Name(
                    id=name_id,
                    name=name_str,
                    gender=gender if gender in ('M', 'F', 'U') else None,
                    length=len(name_str),
                )
                session.add(name)

            await session.commit()
            print(f"  Inserted {min(i + batch_size, len(name_items))}/{len(name_items)} names...")

        # Insert popularity entries
        print("\nInserting popularity entries...")
        for i in range(0, len(selected_popularity), batch_size):
            batch = selected_popularity[i:i + batch_size]

            for entry in batch:
                key = (entry['name'], entry['gender'])
                name_id = unique_names[key]

                pop = NamePopularity(
                    id=str(uuid.uuid4()),
                    name_id=name_id,
                    country_code=entry['country'],
                    popularity_rank=entry['popularity_rank'],
                    weighted_count=entry.get('weighted_count'),
                    total_count=entry.get('total_count'),
                )
                session.add(pop)

            await session.commit()
            print(f"  Inserted {min(i + batch_size, len(selected_popularity))}/{len(selected_popularity)} popularity entries...")

        print(f"\nImport complete!")
        print(f"  Names: {len(unique_names)}")
        print(f"  Popularity entries: {len(selected_popularity)}")


if __name__ == "__main__":
    import sys

    # Parse arguments
    top_n = 2000  # Default: top 2000 names per country
    if len(sys.argv) > 1:
        try:
            top_n = int(sys.argv[1])
        except ValueError:
            print(f"Usage: python -m app.seed.import_names [top_n_per_country]")
            sys.exit(1)

    asyncio.run(import_names(top_n_per_country=top_n))
