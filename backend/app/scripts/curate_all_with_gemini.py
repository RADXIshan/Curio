"""
AI Curation Script for Curio using Gemini 3.5 Flash Lite Interactions API.
Processes all saved posts/reels and accurately classifies, titles, and tags them
based on what the content actually does and says.
"""

import json
import os
import re
import sys
import time
from pathlib import Path
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client()
MODEL_NAME = "gemini-3.5-flash-lite"

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "reels.json"

CATEGORIES = [
    "AI & Agents",
    "System Design & Backend",
    "Web & Frontend",
    "Python & Data Science",
    "DevOps & Cloud",
    "Dev Tools & Resources",
    "Career & Coding Prep",
]

def clean_json_text(text: str) -> str:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text

def curate_batch(items, batch_idx, total_batches):
    items_input = []
    for r in items:
        caption = (r.get("caption") or "").strip()
        # Include up to 600 characters of caption to capture the core technical details
        caption_slice = caption[:600] if len(caption) > 600 else caption
        items_input.append({
            "id": r["id"],
            "caption": caption_slice,
            "creator": (r.get("owner") or {}).get("username") or "",
            "type": r.get("type", "reel"),
            "existing_tags": r.get("hashtags", [])[:6]
        })

    prompt = f"""
You are an expert AI curator for developer bookmarks.
Carefully examine what each Instagram post or reel actually teaches, discusses, or demonstrates.

Assign the single most accurate category from this curated list:
- "AI & Agents": LLMs, AI agents, LangChain/LangGraph, RAG, prompt engineering, neural nets, AI models, OpenAI/Claude/Gemini, AI tools.
- "System Design & Backend": System architecture, microservices, databases, SQL, NoSQL, Redis, Kafka, APIs, scalability, concurrency, Golang/Java/Node/C++.
- "Web & Frontend": React, Next.js, JavaScript, TypeScript, CSS, HTML, UI/UX, animations, web performance, Tailwind.
- "Python & Data Science": Python libraries, pandas, numpy, machine learning, data engineering, Jupyter, data science workflows.
- "DevOps & Cloud": Docker, Kubernetes, AWS/GCP, Linux, CI/CD, Git, GitHub Actions, cloud architecture, networking.
- "Dev Tools & Resources": Open-source repos, developer websites, APIs, cheat sheets, CLI tools, productivity dev tools.
- "Career & Coding Prep": Coding interview prep, LeetCode, DSA, resume tips, CS internships, career advice, tech jobs.

Items to curate:
{json.dumps(items_input, indent=2)}

Return a strict JSON array of objects with fields:
- "id": string (the post id)
- "category": string (MUST be one of the 7 exact category names above)
- "title": string (an informative, substantive title explaining what the post actually covers; NO clickbait like "comment for...", NO emojis, 35-70 characters)
- "tags": list of 3-5 clean, lowercase technical tags

Respond ONLY with the JSON array.
"""

    for attempt in range(3):
        try:
            interaction = client.interactions.create(
                model=MODEL_NAME,
                input=prompt
            )
            raw_text = interaction.output_text
            cleaned = clean_json_text(raw_text)
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                print(f"Batch {batch_idx}/{total_batches} curated successfully ({len(parsed)} items)")
                return {item["id"]: item for item in parsed if "id" in item}
        except Exception as e:
            print(f"Error on batch {batch_idx}, attempt {attempt+1}: {e}")
            time.sleep(2)

    print(f"Failed to curate batch {batch_idx}")
    return {}

def main():
    if not DATA_PATH.exists():
        print(f"Error: {DATA_PATH} not found.")
        sys.exit(1)

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        reels = json.load(f)

    total_items = len(reels)
    print(f"Starting AI curation of {total_items} items with {MODEL_NAME}...")

    batch_size = 15
    batches = [reels[i:i + batch_size] for i in range(0, total_items, batch_size)]
    total_batches = len(batches)

    curated_map = {}
    for idx, batch in enumerate(batches, 1):
        batch_map = curate_batch(batch, idx, total_batches)
        curated_map.update(batch_map)
        time.sleep(0.5)

    print(f"Successfully curated {len(curated_map)} / {total_items} items.")

    # Apply updates to reels
    updated_count = 0
    for r in reels:
        cid = r["id"]
        if cid in curated_map:
            ai_data = curated_map[cid]
            if ai_data.get("category") in CATEGORIES:
                r["category"] = ai_data["category"]
            elif ai_data.get("category"):
                # Normalize if close
                cat = ai_data["category"]
                for valid in CATEGORIES:
                    if valid.lower() in cat.lower():
                        r["category"] = valid
                        break
            if ai_data.get("title"):
                r["title"] = ai_data["title"]
            if ai_data.get("tags"):
                r["hashtags"] = ai_data["tags"]
            updated_count += 1

    # Save updated reels.json
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(reels, f, indent=2, ensure_ascii=False)

    print(f"Updated {updated_count} items in {DATA_PATH}")

    # Print summary of categories
    from collections import Counter
    cat_counts = Counter(r.get("category") for r in reels)
    print("\nFinal AI-Curated Category Distribution:")
    for cat, count in cat_counts.most_common():
        print(f"  {cat}: {count}")

if __name__ == "__main__":
    main()
