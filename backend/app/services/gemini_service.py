"""
Gemini AI service for Curio.
Handles categorization, summarization, and RAG-grounded conversational chat.
Uses Google GenAI Client with interactions.create (model: gemini-3.5-flash-lite).
"""

import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from google import genai

load_dotenv()
logger = logging.getLogger(__name__)

# Initialize client as requested:
# from google import genai
# client = genai.Client()
# interaction = client.interactions.create(model="gemini-3.8-flash", input=...)
# print(interaction.output_text)

try:
    client = genai.Client()
except Exception as e:
    logger.error(f"Failed to initialize GenAI Client: {e}")
    client = None

MODEL_NAME = "gemini-3.5-flash-lite"

CATEGORIES = [
    {
        "id": "ai-agents",
        "name": "AI & Agents",
        "keywords": [
            r"\b(ai|llm|llms|agent|agents|rag|genai|prompt|prompts|claude|gpt|chatgpt|openai|transformer|transformers|neural|deep\s+learning|langchain|langgraph|pytorch|machine\s+learning|gemini|mistral|ollama|anthropic|perceptron|model|weights|training)\b"
        ]
    },
    {
        "id": "system-design",
        "name": "System Design & Backend",
        "keywords": [
            r"\b(system\s+design|backend|microservices|distributed|architecture|redis|kafka|database|databases|sql|nosql|grpc|cache|caching|golang|go\s+language|postgres|postgresql|mongodb|load\s+balancer|load\s+balancing|sharding|pubsub|api\s+gateway|message\s+queue|concurrency|rate\s+limiting)\b"
        ]
    },
    {
        "id": "dsa-problem-solving",
        "name": "DSA & Problem Solving",
        "keywords": [
            r"\b(dsa|leetcode|algorithms|algorithm|data\s+structures|binary\s+tree|graph|dp|dynamic\s+programming|big\s*o|time\s+complexity|sorting|two\s+pointers|sliding\s+window|coding\s+interview|coding\s+prep|neetcode|striver|online\s+assessment|oa)\b"
        ]
    },
    {
        "id": "web-frontend",
        "name": "Web & Frontend",
        "keywords": [
            r"\b(webdevelopment|javascript|typescript|react|next\.?js|css|tailwind|html|frontend|front-end|ui/ux|web\s+app|webdev|dom|svg|flexbox|css\s+grid|canvas|three\.?js|vite|vue|angular)\b"
        ]
    },
    {
        "id": "python-data",
        "name": "Python & Data Science",
        "keywords": [
            r"\b(python|pandas|numpy|datascience|data\s+science|jupyter|notebook|matplotlib|seaborn|scikit|scipy|data\s+analysis|eda|bioinformatics|pythonic|pip)\b"
        ]
    },
    {
        "id": "devops-cloud",
        "name": "DevOps & Cloud",
        "keywords": [
            r"\b(docker|kubernetes|k8s|terraform|cloud|aws|gcp|azure|devops|ci/?cd|linux|git|github\s+actions|bash|shell|networking|ssh|nginx|containers|ansible)\b"
        ]
    },
    {
        "id": "dev-tools-repos",
        "name": "Dev Tools & Repos",
        "keywords": [
            r"\b(github\s+repo|open\s+source|opensource|repo|repos|devtools|dev\s+tools|extension|extensions|vs\s*code|cheat\s+sheet|cheatsheet|terminal|cli|free\s+api|apis|resources|websites)\b"
        ]
    },
    {
        "id": "career-internships",
        "name": "Career & Internships",
        "keywords": [
            r"\b(interview|internship|internships|job|jobs|career|resume|resumes|student|students|college|portfolio|csmajor|cs\s+major|hired|salary|faang|maang|referral)\b"
        ]
    },
    {
        "id": "hackathons-projects",
        "name": "Hackathons & Projects",
        "keywords": [
            r"\b(hackathon|hackathons|sih|smart\s+india\s+hackathon|pitch|pitching|final\s+year\s+project|capstone|demo\s+day)\b"
        ]
    },
    {
        "id": "productivity-learning",
        "name": "Productivity & Learning",
        "keywords": [
            r"\b(productivity|active\s+recall|retention|reading|habits|focus|learning|study|deep\s+work|mindset|psychology)\b"
        ]
    },
    {
        "id": "health-lifestyle",
        "name": "Health, Lifestyle & Interests",
        "keywords": [
            r"\b(posture|sitting|ergonomics|mobility|fitness|health|fashion|ootd|anime|spy\s*family|dating|lifestyle|relationships)\b"
        ]
    },
]


def classify_reel(reel: Dict[str, Any]) -> str:
    """Classify a reel into a category based on its stored category or caption regex."""
    existing = reel.get("category")
    if existing:
        for cat in CATEGORIES:
            if cat["name"].lower() == existing.lower():
                return cat["name"]

    text = (
        (reel.get("caption") or "") + " " +
        " ".join(reel.get("hashtags") or []) + " " +
        ((reel.get("owner") or {}).get("username") or "")
    ).lower()

    for cat in CATEGORIES:
        for pattern in cat["keywords"]:
            if re.search(pattern, text, re.IGNORECASE):
                return cat["name"]

    return "Dev Tools & Repos"


CLICKBAIT_PATTERNS = [
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*comment\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*dm\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*follow\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*save\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*share\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*link in bio\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*drop a\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*type\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*want the\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*send me\b',
]

SPECIFIC_CTA_TRANSFORMS = [
    (r'(?i)comment\s+["“\']?git["”\']?\s+to\s+get\s+(?:the\s+)?(?:full\s+)?pdf\s+guide', 'Complete Git & Version Control PDF Guide'),
    (r'(?i)comment\s+["“\']?agent["”\']?\s+for\s+(?:the\s+)?setup\s+guide', 'AI Agent Architecture & Setup Guide'),
    (r'(?i)comment\s+["“\']?exam["”\']?\s+and\s+i[\'’]?ll\s+send\s+over\s+all\s+(?:the\s+)?links', 'Tech & Coding Exam Preparation Resources'),
    (r'(?i)comment\s+["“\']?google["”\']?\s+and\s+i[\'’]?ll\s+send\s+over\s+all\s+(?:the\s+)?links', 'Google Developer Tools & Learning Resources'),
    (r'(?i)comment\s+["“\']?ai["”\']?\s+to\s+get\s+(?:the\s+)?link', 'Building Neural Networks & Perceptrons from Scratch'),
    (r'(?i)comment\s+["“\']?python["”\']?\s+to\s+get\s+(?:the\s+)?links', '5 Practical Python Projects for Real-World Skills'),
    (r'(?i)comment\s+["“\']?repo["”\']?\s+and\s+i[\'’]?ll\s+send\s+you\s+all\s+5\s+links', '5 Essential GitHub Repositories for Developers'),
    (r'(?i)comment\s+["“\']?games["”\']?\s+and\s+i[\'’]?ll\s+send\s+you\s+all\s+the\s+links', 'Interactive Coding Games to Master AI & Reinforcement Learning'),
    (r'(?i)comment\s+["“\']?system["”\']?\s+for\s+(?:the\s+)?(?:full\s+)?guide', 'System Design Interview & Architecture Guide'),
    (r'(?i)comment\s+["“\']?code["”\']?\s+for\s+(?:the\s+)?source\s+code', 'Source Code & Project Implementation Guide'),
    (r'(?i)comment\s+["“\']?roadmap["”\']?\s+for\s+(?:the\s+)?guide', 'Complete Software Engineering Learning Roadmap'),
]


def clean_leading_junk(text: str) -> str:
    return re.sub(r'^[•\-\*👉✔️✅🚀🔥⚡💡📌👇💬😎❤️\d\.\)\s]+', '', text).strip()


def derive_content_title(caption: Optional[str], owner: Optional[Dict[str, Any]] = None, category: Optional[str] = None) -> str:
    """
    Intelligently derive an informative, substantive title describing what the content is about.
    Avoids clickbait like 'Comment for...', 'Save this post', emojis, etc.
    """
    if not caption or not caption.strip():
        owner_name = (owner or {}).get("name") or (owner or {}).get("username") or "Resource"
        cat = category or "Tech Guide"
        return f"{owner_name}: {cat}"

    first_few = caption[:300]
    for pattern, replacement in SPECIFIC_CTA_TRANSFORMS:
        if re.search(pattern, first_few):
            owner_u = (owner or {}).get("username")
            return f"{replacement} (@{owner_u})" if owner_u and len(replacement) < 55 else replacement

    lines = [l.strip() for l in caption.split("\n") if l.strip()]

    candidate = None
    for line in lines:
        cleaned = clean_leading_junk(line)
        if not cleaned:
            continue
        if cleaned.startswith("#") or cleaned.startswith("http") or cleaned.startswith("www."):
            continue
        is_clickbait = any(re.search(p, cleaned, re.IGNORECASE) for p in CLICKBAIT_PATTERNS)
        if is_clickbait:
            continue
        if len(cleaned) < 10 and len(lines) > 2:
            continue
        candidate = cleaned
        break

    if not candidate:
        for line in lines:
            cleaned = clean_leading_junk(line)
            if len(cleaned) > 15 and not cleaned.startswith("#") and not cleaned.startswith("http"):
                candidate = cleaned
                break

    if not candidate and lines:
        candidate = clean_leading_junk(lines[0])

    if candidate:
        candidate = re.sub(r'(?i)(?:👉|👇)?\s*(?:follow|comment|dm|save|share|link in bio).*$', '', candidate).strip()
        candidate = clean_leading_junk(candidate)
        candidate = re.sub(r'[•\-\*👉✔️✅🚀🔥⚡💡📌👇💬😎❤️]+$', '', candidate).strip()

        if len(candidate) > 75:
            truncated = candidate[:72]
            last_space = truncated.rfind(' ')
            if last_space > 35:
                candidate = truncated[:last_space] + '...'
            else:
                candidate = truncated + '...'
        if len(candidate) > 4:
            return candidate

    owner_u = (owner or {}).get("username") or "Creator"
    return f"{owner_u}: {category or 'Engineering Guide'}"


def clean_json_markdown(text: str) -> str:
    """Strip markdown code block fences if present in JSON output."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


def clean_to_normal_text(text: str) -> str:
    """
    Strips raw markdown symbols (###, ##, ***, **, etc.)
    and converts the text to clean, natural, human-readable normal text.
    """
    if not text:
        return ""

    # Remove markdown headers like ### Heading or ## Heading -> Heading
    text = re.sub(r'^(?:#{1,6}\s*)(.*?)$', r'\1', text, flags=re.MULTILINE)

    # Remove horizontal rules or isolated triple asterisks like ***, ---
    text = re.sub(r'^\s*[\*\-_]{3,}\s*$', '', text, flags=re.MULTILINE)

    # Remove bold-italic ***text*** -> text
    text = re.sub(r'\*{3}(.*?)\*{3}', r'\1', text)

    # Remove bold **text** -> text
    text = re.sub(r'\*{2}(.*?)\*{2}', r'\1', text)

    # Remove italic *text* or _text_ -> text
    text = re.sub(r'(?<!\*)\*([^\*\n]+?)\*(?!\*)', r'\1', text)
    text = re.sub(r'(?<!_)_([^_\n]+?)_(?!_)', r'\1', text)

    # Normalize bullet points: '* item' or '- item' -> '• item'
    text = re.sub(r'^\s*[\*\-]\s+', '• ', text, flags=re.MULTILINE)

    # Remove inline code backticks: `code` -> code
    text = re.sub(r'\`{1,3}(.*?)\`{1,3}', r'\1', text)

    # Normalize excess blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


async def generate_caption_for_reel(reel: Dict[str, Any]) -> Dict[str, Any]:
    """Generate an AI caption and content title using Gemini 3.8 Flash Interactions API."""
    owner = reel.get("owner") or {}
    author = owner.get("name") or owner.get("username") or "Tech Creator"
    username = owner.get("username") or "creator"
    bio_url = owner.get("url") or ""
    post_type = reel.get("type", "reel")
    cat = reel.get("category") or classify_reel(reel)

    if not client:
        return {
            "title": f"{author}: {cat} Guide",
            "caption": f"Educational {post_type} from @{username} sharing core engineering principles, practical code workflows, and system architecture techniques in {cat}.",
            "category": cat,
            "hashtags": [cat.lower().replace(" & ", "").replace(" ", "")],
            "caption_generated": True
        }

    prompt = f"""You are an expert AI curator for developer bookmarks. Generate a realistic, high quality, developer-focused caption and title for this saved Instagram post/reel:
Creator: {author} (@{username})
Creator Bio/Channel: {bio_url}
Format: {post_type}
Topic Domain: {cat}

Return valid JSON strictly matching this schema:
{{
  "title": "A punchy, informative title describing what the content is about (NO clickbait, NO 'comment for...', 40-70 chars)",
  "caption": "Detailed caption (2-3 informative paragraphs) explaining the technical concepts, tools, code patterns, and practical takeaways.",
  "category": "One of: AI & Agents, System Design & Backend, Web & Frontend, Python & Data Science, DevOps & Cloud, Dev Tools & Resources, Career & Coding Prep",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}}

Respond ONLY with valid JSON.
"""

    try:
        interaction = await asyncio.wait_for(
            client.aio.interactions.create(
                model=MODEL_NAME,
                input=prompt
            ),
            timeout=25.0
        )
        cleaned = clean_json_markdown(interaction.output_text)
        data = json.loads(cleaned)
        data["caption_generated"] = True
        return data
    except Exception as e:
        logger.error(f"Caption generation with {MODEL_NAME} failed: {e}")

    return {
        "title": f"{author}: {cat} Guide",
        "caption": f"Educational {post_type} from @{username} sharing core engineering principles, practical code workflows, and system architecture techniques in {cat}.",
        "category": cat,
        "hashtags": [cat.lower().replace(" & ", "").replace(" ", "")],
        "caption_generated": True
    }


async def summarize_reel_content(reel: Dict[str, Any]) -> Dict[str, Any]:
    """Generate an AI summary, key takeaways, and relevant tools using Gemini 3.5 Flash-Lite Interactions API."""
    if not client:
        return {
            "summary": "Gemini API client is not configured.",
            "key_takeaways": ["Please ensure GEMINI_API_KEY is available in backend environment"],
            "category": classify_reel(reel),
            "suggested_actions": [],
        }

    caption = reel.get("caption") or "No caption provided."
    author = (reel.get("owner") or {}).get("name") or (reel.get("owner") or {}).get("username") or "Unknown author"
    tags = ", ".join(reel.get("hashtags") or [])
    cat = reel.get("category") or classify_reel(reel)

    prompt = f"""You are an expert AI curator for developer bookmarks. Analyze this saved Instagram reel/post and provide structured insights.

Post by: {author}
Category: {cat}
Hashtags: {tags}
Caption:
\"\"\"
{caption}
\"\"\"

Return a valid JSON object strictly matching this schema:
{{
  "category": "{cat}",
  "one_line_summary": "Crisp 1-2 sentence executive summary of what this post is about and what it teaches or does",
  "key_takeaways": ["3-5 clear, highly actionable bullet points or tools mentioned"],
  "resources_mentioned": ["Any github repos, tools, websites, books or concepts mentioned"],
  "action_item": "One practical thing the user can do right now with this info"
}}

Respond ONLY with the JSON object.
"""

    try:
        interaction = await asyncio.wait_for(
            client.aio.interactions.create(
                model=MODEL_NAME,
                input=prompt
            ),
            timeout=25.0
        )
        cleaned = clean_json_markdown(interaction.output_text)
        data = json.loads(cleaned)
        if "one_line_summary" in data and isinstance(data["one_line_summary"], str):
            data["one_line_summary"] = clean_to_normal_text(data["one_line_summary"])
        if "key_takeaways" in data and isinstance(data["key_takeaways"], list):
            data["key_takeaways"] = [clean_to_normal_text(str(p)) for p in data["key_takeaways"]]
        if "action_item" in data and isinstance(data["action_item"], str):
            data["action_item"] = clean_to_normal_text(data["action_item"])
        return data
    except Exception as e:
        logger.error(f"Summarization with {MODEL_NAME} failed: {e}")

    return {
        "category": cat,
        "one_line_summary": (caption[:150] + "...") if len(caption) > 150 else caption,
        "key_takeaways": [
            f"Saved from @{(reel.get('owner') or {}).get('username') or 'creator'}",
            "Review full caption for steps, links, and resources",
        ],
        "resources_mentioned": [],
        "action_item": "Open on Instagram to review",
    }


def search_relevant_reels(query: str, all_reels: List[Dict[str, Any]], top_k: int = 8) -> List[Dict[str, Any]]:
    """Retrieve top_k most relevant reels for a user query using keyword and semantic match."""
    q_words = [w.lower() for w in query.split() if len(w) > 2]
    if not q_words:
        return all_reels[:top_k]

    scored = []
    for r in all_reels:
        score = 0
        caption = (r.get("caption") or "").lower()
        title = (r.get("title") or "").lower()
        tags = " ".join(r.get("hashtags") or []).lower()
        cat = (r.get("category") or "").lower()
        owner = ((r.get("owner") or {}).get("username") or "").lower()
        author_name = ((r.get("owner") or {}).get("name") or "").lower()

        for w in q_words:
            if w in title:
                score += 5
            if w in caption:
                score += 3
            if w in tags:
                score += 4
            if w in cat:
                score += 3
            if w in owner or w in author_name:
                score += 2

        if score > 0:
            scored.append((score, r))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = [item[1] for item in scored[:top_k]]
    if not results:
        results = all_reels[:top_k]
    return results


async def chat_with_curio(
    message: str,
    history: List[Dict[str, str]],
    all_reels: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    RAG-grounded conversational chatbot that answers questions based on user's saved reels
    using Gemini 3.5 Flash-Lite Interactions API.
    """
    if not client:
        return {
            "reply": "Gemini API client is not configured. Please ensure GEMINI_API_KEY is set in backend environment.",
            "referenced_reels": [],
        }

    # Find relevant reels to feed as grounding context
    relevant_reels = search_relevant_reels(message, all_reels, top_k=6)

    context_snippets = []
    for idx, r in enumerate(relevant_reels, 1):
        author = (r.get("owner") or {}).get("username") or "author"
        url = r.get("url")
        shortcode = r.get("id")
        title = r.get("title") or "Saved post"
        cat = r.get("category") or "General Tech"
        caption = (r.get("caption") or "").strip().replace("\n", " ")
        if len(caption) > 300:
            caption = caption[:300] + "..."
        context_snippets.append(
            f"[{idx}] ID: {shortcode} | Title: {title} | Category: {cat} | By: @{author} | URL: {url}\nCaption: {caption}"
        )

    context_str = "\n\n".join(context_snippets)

    # Format conversation history
    history_snippets = []
    for h in history[-6:]:
        role = "User" if h.get("role") == "user" else "Curio AI"
        history_snippets.append(f"{role}: {h.get('content', '')}")
    history_str = "\n".join(history_snippets) if history_snippets else "No prior conversation."

    prompt = f"""You are Curio AI, an intelligent, sleek, and helpful personal knowledge assistant.
The user has saved {len(all_reels)} posts and reels from Instagram covering AI & Agents, System Design, DSA, Web & Frontend, Python, DevOps, Career, Hackathons, Productivity, and Lifestyle.

You have access to the user's saved posts. Here are the most relevant ones retrieved for the current query:

<SAVED_POSTS_CONTEXT>
{context_str}
</SAVED_POSTS_CONTEXT>

Guidelines:
1. Answer the user's question directly, clearly, and insightfully based on their saved posts whenever possible.
2. If citing a post, reference it by title and author (@username), and include its link or ID.
3. Formatting: Write in clean, normal prose. Absolutely DO NOT use markdown headers (no ## or ###). DO NOT use asterisks for bolding or emphasis (no **, no ***). Use clean paragraphs and simple bullet points (•) where appropriate. Make it read like clean, natural, human text.
4. If the saved posts don't contain specific information, state what is available in their collection and provide helpful general advice.
5. Tone: Knowledgeable, enthusiastic, concise, and modern.

Conversation History:
{history_str}

User Question: {message}
"""

    try:
        interaction = await asyncio.wait_for(
            client.aio.interactions.create(
                model=MODEL_NAME,
                input=prompt
            ),
            timeout=30.0
        )
        return {
            "reply": clean_to_normal_text(interaction.output_text),
            "referenced_reels": relevant_reels,
        }
    except Exception as e:
        logger.error(f"Chat generation with {MODEL_NAME} failed: {e}")

    return {
        "reply": "I'm temporarily unable to reach the Gemini service. Here are the most relevant reels matching your question from your collection.",
        "referenced_reels": relevant_reels,
    }
