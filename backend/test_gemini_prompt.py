"""
Test Gemini 2.5 Flash prompt for name facts with structured output.
Run with: python test_gemini_prompt.py
"""
import os
import json
import time
from typing import Optional
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Define the JSON schema for structured output
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

TEST_NAMES = [
    ("James", "M"),
    ("Sofia", "F"),
]


def test_name(model, name: str, gender: str) -> dict:
    prompt = PROMPT_TEMPLATE.format(name=name, gender=gender)
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=NAME_FACTS_SCHEMA
        )
    )
    return response.text


def main():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found")
        return

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    print("=" * 70)
    print("TESTING GEMINI 2.5 FLASH - STRUCTURED OUTPUT")
    print("=" * 70)

    total_time = 0
    for name, gender in TEST_NAMES:
        print(f"\n{'='*70}")
        print(f"NAME: {name} ({gender})")
        print("=" * 70)

        try:
            start = time.time()
            result = test_name(model, name, gender)
            elapsed = time.time() - start
            total_time += elapsed

            parsed = json.loads(result)
            print(json.dumps(parsed, indent=2))
            print(f"\n⏱️  Time: {elapsed:.2f}s")
        except Exception as e:
            print(f"ERROR: {e}")

    print(f"\n{'='*70}")
    print(f"TOTAL TIME: {total_time:.2f}s for {len(TEST_NAMES)} names")
    print(f"AVG TIME: {total_time/len(TEST_NAMES):.2f}s per name")
    print("=" * 70)


if __name__ == "__main__":
    main()
