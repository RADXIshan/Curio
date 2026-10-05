"""
Reels data management and query service.
"""

from collections import Counter
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .extractor import extract_saved_posts
from .gemini_service import CATEGORIES, classify_reel, derive_content_title
from .search_engine import smart_search_reels

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
HTML_PATH = DATA_DIR / "saved_posts.html"
JSON_PATH = DATA_DIR / "reels.json"

_CACHED_REELS: Optional[List[Dict[str, Any]]] = None
_CACHED_MTIME: Optional[float] = None


def load_reels(force_reload: bool = False) -> List[Dict[str, Any]]:
    """
    Load reels from JSON file.
    If missing or empty and HTML exists, extract automatically.
    Attaches smart category classification and content-based title to each reel.
    Auto-invalidates when reels.json file is modified.
    """
    global _CACHED_REELS, _CACHED_MTIME

    curr_mtime = JSON_PATH.stat().st_mtime if JSON_PATH.exists() else 0.0

    if _CACHED_REELS is not None and not force_reload and curr_mtime == _CACHED_MTIME:
        return _CACHED_REELS

    if not JSON_PATH.exists() or JSON_PATH.stat().st_size <= 2:
        if HTML_PATH.exists():
            raw_items = extract_saved_posts(HTML_PATH, JSON_PATH)
        else:
            raw_items = []
    else:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            raw_items = json.load(f)


    # Attach category, title, flags, and normalize exact browser URLs
    for r in raw_items:
        # Sanitize and ensure accurate browser URLs (never /post/)
        u = r.get("url") or ""
        shortcode = r.get("id") or ""
        if "/post/" in u and shortcode:
            prefix = "reel" if r.get("type") == "reel" else "p"
            r["url"] = f"https://www.instagram.com/{prefix}/{shortcode}/"
        if not r.get("category"):
            r["category"] = classify_reel(r)
        if not r.get("title"):
            r["title"] = derive_content_title(r.get("caption"), r.get("owner"), r.get("category"))
        if "caption_generated" not in r:
            r["caption_generated"] = False

    _CACHED_REELS = raw_items
    _CACHED_MTIME = curr_mtime
    return _CACHED_REELS


def get_reels(
    post_type: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "newest",
    limit: int = 50,
    offset: int = 0,
) -> Tuple[int, List[Dict[str, Any]]]:
    """Filter, sort, and paginate reels list."""
    items = list(load_reels())

    clean_type = post_type if isinstance(post_type, str) else None
    clean_cat = category if isinstance(category, str) else None
    clean_tag = tag if isinstance(tag, str) else None
    clean_search = search if isinstance(search, str) else None
    clean_sort = (sort_by or "newest").strip().lower()
    clean_limit = int(limit) if isinstance(limit, (int, float)) or (isinstance(limit, str) and limit.isdigit()) else 50
    clean_offset = int(offset) if isinstance(offset, (int, float)) or (isinstance(offset, str) and offset.isdigit()) else 0

    if clean_type and clean_type.lower() != "all":
        target_type = clean_type.strip().lower()
        items = [i for i in items if i.get("type", "").lower() == target_type]

    if clean_cat and clean_cat.lower() != "all":
        target_cat = clean_cat.strip().lower()
        items = [i for i in items if i.get("category", "").lower() == target_cat]

    if clean_tag:
        target_tag = clean_tag.strip().lstrip("#").lower()
        items = [
            i for i in items
            if any(t.lower() == target_tag for t in i.get("hashtags", []))
        ]

    if clean_search:
        items = smart_search_reels(clean_search, items)
        for i in items:
            if "_search_meta" in i and "search_meta" not in i:
                i["search_meta"] = i["_search_meta"]

    # Sorting
    if clean_sort in ("relevance", "best", "match") and clean_search:
        # Keep smart search relevance ranking
        pass
    elif clean_sort == "oldest":
        items.sort(key=lambda x: x.get("saved_at_iso") or "")
    elif clean_sort == "title":
        items.sort(key=lambda x: (x.get("title") or "").lower())
    elif clean_sort == "author":
        items.sort(key=lambda x: ((x.get("owner") or {}).get("username") or "").lower())
    elif clean_sort == "newest":
        # If user explicitly filtered by newest without relevance
        items.sort(key=lambda x: x.get("saved_at_iso") or "", reverse=True)
    else:  # default
        if not clean_search:
            items.sort(key=lambda x: x.get("saved_at_iso") or "", reverse=True)

    total = len(items)
    paginated = items[clean_offset : clean_offset + clean_limit]
    return total, paginated


def get_reel_by_id(reel_id: str) -> Optional[Dict[str, Any]]:
    """Find a reel/post by shortcode ID."""
    items = load_reels()
    for item in items:
        if item.get("id") == reel_id:
            return item
    return None


def get_stats() -> Dict[str, Any]:
    """Calculate overall statistics: total items, reels vs posts, categories, top tags."""
    items = load_reels()
    total = len(items)
    reels_count = sum(1 for i in items if i.get("type") == "reel")
    posts_count = sum(1 for i in items if i.get("type") == "post")

    category_counts = Counter(i.get("category", "General Tech") for i in items)
    tag_counts = Counter(tag.lower() for i in items for tag in i.get("hashtags", []))

    categories_list = [
        {"name": name, "count": count}
        for name, count in category_counts.most_common()
    ]
    top_tags = [
        {"name": tag, "count": count}
        for tag, count in tag_counts.most_common(25)
    ]

    return {
        "total": total,
        "reels_count": reels_count,
        "posts_count": posts_count,
        "categories": categories_list,
        "top_tags": top_tags,
    }
