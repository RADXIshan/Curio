"""
FastAPI router for reels and posts endpoints.
"""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.models.reels import ExtractionResponse, ReelItem, ReelsListResponse, StatsResponse
from app.services.extractor import extract_saved_posts
from app.services.reels_service import get_reel_by_id, get_reels, get_stats

router = APIRouter(prefix="/api/reels", tags=["reels"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
HTML_PATH = DATA_DIR / "saved_posts.html"
JSON_PATH = DATA_DIR / "reels.json"


@router.get("", response_model=ReelsListResponse)
def list_reels(
    type: Optional[str] = Query(None, description="Filter by post type: 'reel' or 'post'"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in caption, owner, hashtags, or category"),
    tag: Optional[str] = Query(None, description="Filter by hashtag"),
    sort: Optional[str] = Query("newest", description="Sort by: 'newest', 'oldest', 'title', 'author'"),
    limit: int = Query(50, ge=1, le=500, description="Max number of items to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """Retrieve saved reels and posts with optional filtering, sorting, and pagination."""
    total, items = get_reels(
        post_type=type,
        category=category,
        tag=tag,
        search=search,
        sort_by=sort,
        limit=limit,
        offset=offset,
    )
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "count": len(items),
        "items": items,
    }


@router.get("/stats", response_model=StatsResponse)
def reels_stats():
    """Get aggregated statistics about saved posts, categories, and tags."""
    return get_stats()


@router.get("/{reel_id}", response_model=ReelItem)
def get_reel(reel_id: str):
    """Retrieve a single saved post/reel by its shortcode ID."""
    reel = get_reel_by_id(reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel/post not found")
    return reel


@router.post("/extract", response_model=ExtractionResponse)
def run_extraction():
    """Trigger re-extraction of saved posts from saved_posts.html to reels.json."""
    if not HTML_PATH.exists():
        raise HTTPException(status_code=404, detail=f"HTML source file not found at {HTML_PATH}")

    extracted = extract_saved_posts(HTML_PATH, JSON_PATH)
    return {
        "status": "success",
        "message": f"Successfully extracted {len(extracted)} items.",
        "count": len(extracted),
    }
