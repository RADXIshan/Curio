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

FALLBACK_MODELS = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-pro-latest"]

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
