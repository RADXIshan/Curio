"""
Gemini AI service for Curio.
Handles categorization, summarization, and RAG-grounded conversational chat.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
logger = logging.getLogger(__name__)

# Initialize client
API_KEY = os.getenv("GEMINI_API_KEY")
client: Optional[genai.Client] = None
if API_KEY:
    try:
        client = genai.Client(api_key=API_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini Client: {e}")

FALLBACK_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-flash-latest",
]

CATEGORIES = [
    {"id": "ai-agents", "name": "AI & Agents", "keywords": ["agent", "agents", "llm", "rag", "genai", "prompt", "claude", "gpt", "transformer", "neural", "deep learning"]},
    {"id": "system-design", "name": "System Design & Backend", "keywords": ["system design", "backend", "microservices", "distributed", "architecture", "redis", "kafka", "database", "sql", "grpc", "cache"]},
    {"id": "python-data", "name": "Python & Data Science", "keywords": ["python", "pandas", "numpy", "datascience", "machine learning", "pytorch", "jupyter", "perceptron"]},
    {"id": "devops-cloud", "name": "DevOps & Cloud", "keywords": ["docker", "kubernetes", "terraform", "cloud", "aws", "devops", "ci/cd", "linux", "git"]},
    {"id": "career-learning", "name": "Career & Internships", "keywords": ["interview", "internship", "job", "career", "resume", "student", "college", "portfolio", "csmajor"]},
    {"id": "tools-resources", "name": "Dev Tools & Open Source", "keywords": ["github", "opensource", "repo", "devtools", "extension", "website", "cheat sheet", "tools"]},
    {"id": "web-frontend", "name": "Web & Frontend", "keywords": ["webdevelopment", "javascript", "react", "next.js", "css", "html", "svg", "ui", "ux", "frontend"]},
]


def classify_reel(reel: Dict[str, Any]) -> str:
    """Classify a reel into a category based on its caption, tags, and content."""
    text = (
        (reel.get("caption") or "") + " " +
        " ".join(reel.get("hashtags") or []) + " " +
        ((reel.get("owner") or {}).get("username") or "")
    ).lower()

    for cat in CATEGORIES:
        for kw in cat["keywords"]:
            if kw in text:
                return cat["name"]

    return "General Tech"


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
    import re
    return re.sub(r'^[•\-\*👉✔️✅🚀🔥⚡💡📌👇💬😎❤️\d\.\)\s]+', '', text).strip()


def derive_content_title(caption: Optional[str], owner: Optional[Dict[str, Any]] = None, category: Optional[str] = None) -> str:
    """
    Intelligently derive an informative, substantive title describing what the content is about.
    Avoids clickbait like 'Comment for...', 'Save this post', emojis, etc.
    """
    import re
    if not caption or not caption.strip():
        owner_name = (owner or {}).get("name") or (owner or {}).get("username") or "Resource"
        cat = category or "General Tech"
        return f"{owner_name}: {cat} Guide"

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
    return f"{owner_u}: {category or 'Tech Guide'}"


async def generate_caption_for_reel(reel: Dict[str, Any]) -> Dict[str, Any]:
    """Generate an AI caption and content title for a reel that has no caption."""
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

    prompt = f"""
You are an expert AI curator for developer bookmarks. Generate a realistic, high quality, developer-focused caption and title for this saved Instagram post/reel:
Creator: {author} (@{username})
Creator Bio/Channel: {bio_url}
Format: {post_type}
Topic Domain: {cat}

Return valid JSON strictly matching this schema:
{{
  "title": "A punchy, informative title describing what the content is about (NO clickbait, NO 'comment for...', 40-70 chars)",
  "caption": "Detailed caption (2-3 informative paragraphs) explaining the technical concepts, tools, code patterns, and practical takeaways.",
  "category": "One of: AI & Agents, System Design & Backend, Python & Data Science, DevOps & Cloud, Career & Internships, Dev Tools & Open Source, Web & Frontend",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}}
"""

    for model_name in FALLBACK_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                )
            )
            if response.text:
                data = json.loads(response.text)
                data["caption_generated"] = True
                return data
        except Exception as e:
            logger.warning(f"Caption generation with {model_name} failed: {e}. Trying next...")

    return {
        "title": f"{author}: {cat} Guide",
        "caption": f"Educational {post_type} from @{username} sharing core engineering principles, practical code workflows, and system architecture techniques in {cat}.",
        "category": cat,
        "hashtags": [cat.lower().replace(" & ", "").replace(" ", "")],
        "caption_generated": True
    }


async def summarize_reel_content(reel: Dict[str, Any]) -> Dict[str, Any]:
    """Generate an AI summary, key takeaways, and relevant tools from a reel."""
    if not client:
        return {
            "summary": "Gemini API key is not configured.",
            "key_takeaways": ["Please set GEMINI_API_KEY in backend/.env"],
            "category": classify_reel(reel),
            "suggested_actions": [],
        }

    caption = reel.get("caption") or "No caption provided."
    author = (reel.get("owner") or {}).get("name") or (reel.get("owner") or {}).get("username") or "Unknown author"
    tags = ", ".join(reel.get("hashtags") or [])

    prompt = f"""
You are an expert AI curator for developer bookmarks. Analyze this saved Instagram reel/post and provide structured insights.

Post by: {author}
Hashtags: {tags}
Caption:
\"\"\"
{caption}
\"\"\"

Return a valid JSON object strictly matching this schema:
{{
  "category": "one short concise category name (e.g. AI & Agents, System Design, Python & ML, Career, DevOps)",
  "one_line_summary": "Crisp 1-2 sentence executive summary of what this post is about",
  "key_takeaways": ["3-5 clear, highly actionable bullet points or tools mentioned"],
  "resources_mentioned": ["Any github repos, tools, websites, books or concepts mentioned"],
  "action_item": "One practical thing the user can do right now with this info"
}}
Do NOT wrap in markdown fences other than json or return extra text.
"""

    data = None
    for model_name in FALLBACK_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                )
            )
            if response.text:
                data = json.loads(response.text)
                return data
        except Exception as e:
            logger.warning(f"Summarization with {model_name} failed: {e}. Trying next fallback...")

    logger.error("All Gemini models failed for summarization. Using graceful fallback.")
    return {
        "category": classify_reel(reel),
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
        tags = " ".join(r.get("hashtags") or []).lower()
        owner = ((r.get("owner") or {}).get("username") or "").lower()
        author_name = ((r.get("owner") or {}).get("name") or "").lower()

        for w in q_words:
            if w in caption:
                score += 3
            if w in tags:
                score += 4
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
    RAG-grounded conversational chatbot that answers questions based on user's saved reels.
    """
    if not client:
        return {
            "reply": "Gemini API key is not configured. Please ensure GEMINI_API_KEY is set in backend/.env.",
            "referenced_reels": [],
        }

    # Find relevant reels to feed as grounding context
    relevant_reels = search_relevant_reels(message, all_reels, top_k=6)

    context_snippets = []
    for idx, r in enumerate(relevant_reels, 1):
        author = (r.get("owner") or {}).get("username") or "author"
        url = r.get("url")
        shortcode = r.get("id")
        caption = (r.get("caption") or "").strip().replace("\n", " ")
        if len(caption) > 300:
            caption = caption[:300] + "..."
        context_snippets.append(
            f"[{idx}] ID: {shortcode} | Type: {r.get('type')} | By: @{author} | URL: {url}\nCaption: {caption}"
        )

    context_str = "\n\n".join(context_snippets)

    system_instruction = f"""
You are Curio AI, an intelligent, sleek, and helpful personal knowledge assistant.
The user has saved 448 posts and reels from Instagram covering AI, System Design, Software Engineering, Python, Career Tips, and Dev Tools.

You have access to the user's saved posts. Here are the most relevant ones retrieved for the current query:

<SAVED_POSTS_CONTEXT>
{context_str}
</SAVED_POSTS_CONTEXT>

Guidelines:
1. Answer the user's question directly, clearly, and insightfully based on their saved posts whenever possible.
2. If citing a post, reference it by author (@username) and include its Instagram link or ID.
3. Keep formatting clean with markdown bullet points, bold headers, and concise code or tool names.
4. If the saved posts don't contain specific information, state what is available in their collection and provide helpful general advice.
5. Tone: Knowledgeable, enthusiastic, concise, and modern.
"""

    # Build contents with history
    contents = []
    for h in history[-6:]:
        role = "user" if h.get("role") == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=h.get("content", ""))]))

    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))

    for model_name in FALLBACK_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                )
            )
            if response.text:
                return {
                    "reply": response.text,
                    "referenced_reels": relevant_reels,
                }
        except Exception as e:
            logger.warning(f"Chat generation with {model_name} failed: {e}. Trying fallback...")

    return {
        "reply": "I'm temporarily unable to reach the Gemini service. Here are the most relevant reels matching your question from your collection.",
        "referenced_reels": relevant_reels,
    }
