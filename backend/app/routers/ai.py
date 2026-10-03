"""
FastAPI router for Gemini AI capabilities: Chat, Summarization, and Insights.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.gemini_service import chat_with_curio, summarize_reel_content
from app.services.reels_service import get_reel_by_id, load_reels

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    referenced_reels: List[Dict[str, Any]] = []


class SummarizeRequest(BaseModel):
    reel_id: Optional[str] = None
    caption: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Interactive AI chatbot grounded in user's saved reels and posts.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    all_reels = load_reels()
    history_dicts = [{"role": m.role, "content": m.content} for m in request.history]

    result = await chat_with_curio(
        message=request.message,
        history=history_dicts,
        all_reels=all_reels,
    )
    return result


@router.post("/summarize/{reel_id}")
async def summarize_reel_endpoint(reel_id: str):
    """Generate structured AI summary and key takeaways for a specific reel."""
    reel = get_reel_by_id(reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")

    summary = await summarize_reel_content(reel)
    return {
        "reel_id": reel_id,
        **summary,
    }


@router.get("/status")
def ai_status():
    """Check if Gemini API is configured and operational."""
    import os
    key = os.getenv("GEMINI_API_KEY")
    return {
        "configured": bool(key),
        "model": "gemini-3.8-flash",
    }
