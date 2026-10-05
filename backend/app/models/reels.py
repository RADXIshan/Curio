"""
Pydantic schemas for reels and posts.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class OwnerInfo(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    url: Optional[str] = None


class BrandPartnerInfo(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    url: Optional[str] = None


class ReelItem(BaseModel):
    id: Optional[str] = None
    type: str = "post"
    url: str
    title: Optional[str] = None
    caption: Optional[str] = None
    caption_generated: Optional[bool] = False
    category: Optional[str] = "General Tech"
    hashtags: List[str] = []
    owner: OwnerInfo
    brand_partner: Optional[BrandPartnerInfo] = None
    saved_at: Optional[str] = None
    saved_at_iso: Optional[str] = None
    search_meta: Optional[Dict[str, Any]] = None


class ReelsListResponse(BaseModel):
    total: int
    offset: int
    limit: int
    count: int
    items: List[ReelItem]


class ExtractionResponse(BaseModel):
    status: str
    message: str
    count: int


class CategoryCount(BaseModel):
    name: str
    count: int


class TagCount(BaseModel):
    name: str
    count: int


class StatsResponse(BaseModel):
    total: int
    reels_count: int
    posts_count: int
    categories: List[CategoryCount]
    top_tags: List[TagCount]
