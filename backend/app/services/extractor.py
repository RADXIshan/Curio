"""
Instagram saved posts extractor service.

Parses saved_posts.html export and extracts structured posts/reels data into reels.json.
"""

import html
import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def clean_text(raw_text: Optional[str]) -> Optional[str]:
    """Clean HTML entities and normalize whitespace in extracted text."""
    if not raw_text:
        return None
    decoded = html.unescape(raw_text)
    cleaned = decoded.strip()
    return cleaned if cleaned else None


def parse_timestamp(date_str: Optional[str]) -> Optional[str]:
    """Parse Instagram export date string into ISO 8601 format."""
    if not date_str:
        return None
    formats = [
        "%b %d, %Y %I:%M %p",   # e.g. Oct 03, 2026 8:55 am
        "%B %d, %Y %I:%M %p",
        "%b %d, %Y, %I:%M %p",
        "%Y-%m-%d %H:%M:%S",
    ]
    cleaned = date_str.strip()
    for fmt in formats:
        try:
            dt = datetime.strptime(cleaned, fmt)
            return dt.isoformat()
        except ValueError:
            continue
    return None


def parse_single_post(block_html: str, saved_at_raw: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Parse an HTML fragment corresponding to a single saved post entry."""
    # 1. Post URL & Shortcode & Type
    url_match = re.search(
        r'<td[^>]*class=["\']_a6_q["\'][^>]*>\s*URL\s*<div>\s*<a[^>]*href=["\']([^"\']+)["\']',
        block_html,
        re.IGNORECASE,
    )
    if not url_match:
        url_match = re.search(
            r'href=["\'](https?://(?:www\.)?instagram\.com/(?:reel|p)/[^"\']+)["\']',
            block_html,
            re.IGNORECASE,
        )
        if not url_match:
            return None

    post_url = url_match.group(1).strip()
    
    shortcode = None
    post_type = "post"
    code_match = re.search(r"instagram\.com/(reel|p)/([^/?#&]+)", post_url)
    if code_match:
        type_str = code_match.group(1).lower()
        post_type = "reel" if type_str == "reel" else "post"
        shortcode = code_match.group(2)

    # 2. Caption
    caption = None
    caption_match = re.search(
        r'<td[^>]*class=["\']_a6_q["\'][^>]*>\s*Caption\s*</td>\s*<td[^>]*class=["\']_2piu\s+_a6_r["\'][^>]*>(.*?)</td>',
        block_html,
        re.DOTALL | re.IGNORECASE,
    )
    if caption_match:
        raw_caption = caption_match.group(1)
        text_only = re.sub(r'<[^>]+>', '', raw_caption)
        caption = clean_text(text_only)

    # 3. Hashtags
    hashtags: List[str] = []
    hashtag_section = re.search(
        r'<h2[^>]*>\s*Hashtags\s*</h2>(.*?)(?=<h2|<div\s+class=["\']_3-94\s+_a6-o["\']|$)',
        block_html,
        re.DOTALL | re.IGNORECASE,
    )
    if hashtag_section:
        tag_html = hashtag_section.group(1)
        raw_tags = re.findall(r'<div[^>]*class=["\']_a6-p["\'][^>]*>([^<]+)</div>', tag_html)
        for t in raw_tags:
            cleaned_tag = clean_text(t)
            if cleaned_tag and cleaned_tag.lower() != "name" and cleaned_tag not in hashtags:
                hashtags.append(cleaned_tag)

    # 4. Owner
    owner: Dict[str, Optional[str]] = {"name": None, "username": None, "url": None}
    owner_section = re.search(
        r'<h2[^>]*>\s*Owner\s*</h2>(.*?)(?=<h2|<div\s+class=["\']_3-94\s+_a6-o["\']|$)',
        block_html,
        re.DOTALL | re.IGNORECASE,
    )
    if owner_section:
        o_html = owner_section.group(1)
        o_url = re.search(
            r'<td[^>]*class=["\']_a6_q["\'][^>]*>\s*URL\s*</td>\s*<td[^>]*class=["\']_2piu\s+_a6_r["\'][^>]*>(.*?)</td>',
            o_html,
            re.DOTALL | re.IGNORECASE,
        )
        o_name = re.search(
            r'<td[^>]*class=["\']_a6_q["\'][^>]*>\s*Name\s*</td>\s*<td[^>]*class=["\']_2piu\s+_a6_r["\'][^>]*>(.*?)</td>',
            o_html,
            re.DOTALL | re.IGNORECASE,
        )
        o_username = re.search(
            r'<td[^>]*class=["\']_a6_q["\'][^>]*>\s*Username\s*</td>\s*<td[^>]*class=["\']_2piu\s+_a6_r["\'][^>]*>(.*?)</td>',
            o_html,
            re.DOTALL | re.IGNORECASE,
        )
        if o_url:
            owner["url"] = clean_text(re.sub(r'<[^>]+>', '', o_url.group(1)))
        if o_name:
            owner["name"] = clean_text(re.sub(r'<[^>]+>', '', o_name.group(1)))
        if o_username:
            owner["username"] = clean_text(re.sub(r'<[^>]+>', '', o_username.group(1)))

    # 5. Brand Partner (optional)
    brand_partner: Optional[Dict[str, Optional[str]]] = None
    bp_section = re.search(
        r'<h2[^>]*>\s*Brand partner\s*</h2>(.*?)(?=<h2|<div\s+class=["\']_3-94\s+_a6-o["\']|$)',
        block_html,
        re.DOTALL | re.IGNORECASE,
    )
    if bp_section:
        bp_html = bp_section.group(1)
        bp_data: Dict[str, Optional[str]] = {"name": None, "username": None, "url": None}
        bp_url = re.search(
            r'<td[^>]*class=["\']_a6_q["\'][^>]*>\s*URL\s*</td>\s*<td[^>]*class=["\']_2piu\s+_a6_r["\'][^>]*>(.*?)</td>',
            bp_html,
            re.DOTALL | re.IGNORECASE,
        )
        bp_name = re.search(
            r'<td[^>]*class=["\']_a6_q["\'][^>]*>\s*Name\s*</td>\s*<td[^>]*class=["\']_2piu\s+_a6_r["\'][^>]*>(.*?)</td>',
            bp_html,
            re.DOTALL | re.IGNORECASE,
        )
        bp_username = re.search(
            r'<td[^>]*class=["\']_a6_q["\'][^>]*>\s*Username\s*</td>\s*<td[^>]*class=["\']_2piu\s+_a6_r["\'][^>]*>(.*?)</td>',
            bp_html,
            re.DOTALL | re.IGNORECASE,
        )
        if bp_url:
            bp_data["url"] = clean_text(re.sub(r'<[^>]+>', '', bp_url.group(1)))
        if bp_name:
            bp_data["name"] = clean_text(re.sub(r'<[^>]+>', '', bp_name.group(1)))
        if bp_username:
            bp_data["username"] = clean_text(re.sub(r'<[^>]+>', '', bp_username.group(1)))
        if any(bp_data.values()):
            brand_partner = bp_data

    # 6. Saved At
    if not saved_at_raw:
        date_match = re.search(r'<div[^>]*class=["\']_3-94\s+_a6-o["\'][^>]*>([^<]+)</div>', block_html)
        if date_match:
            saved_at_raw = date_match.group(1).strip()

    saved_at = clean_text(saved_at_raw)
    saved_at_iso = parse_timestamp(saved_at)

    return {
        "id": shortcode,
        "type": post_type,
        "url": post_url,
        "caption": caption,
        "hashtags": hashtags,
        "owner": owner,
        "brand_partner": brand_partner,
        "saved_at": saved_at,
        "saved_at_iso": saved_at_iso,
    }


def extract_saved_posts(
    html_path: str | Path,
    output_json_path: str | Path,
) -> List[Dict[str, Any]]:
    """Parse saved_posts.html and write the structured post records to output_json_path."""
    html_file = Path(html_path)
    output_file = Path(output_json_path)

    if not html_file.exists():
        raise FileNotFoundError(f"Input HTML file not found: {html_file}")

    logger.info(f"Reading {html_file}...")
    with open(html_file, "r", encoding="utf-8") as f:
        content = f.read()

    main_match = re.search(r'<main[^>]*>(.*?)</main>', content, re.DOTALL | re.IGNORECASE)
    search_scope = main_match.group(1) if main_match else content

    pattern = re.compile(
        r'(<div\s+class=["\']pam\s+_3-95\s+_2ph-\s+_a6-g\s+uiBoxWhite\s+noborder["\']>'
        r'.*?'
        r'<div\s+class=["\']_3-94\s+_a6-o["\']>([^<]+)</div>\s*</div>)',
        re.DOTALL | re.IGNORECASE,
    )

    matches = list(pattern.finditer(search_scope))
    posts: List[Dict[str, Any]] = []

    for match in matches:
        block_html = match.group(1)
        saved_at_str = match.group(2)
        post_data = parse_single_post(block_html, saved_at_str)
        if post_data:
            posts.append(post_data)

    logger.info(f"Extracted {len(posts)} posts from {html_file}")
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(posts, f, indent=2, ensure_ascii=False)

    logger.info(f"Successfully saved {len(posts)} posts to {output_file}")
    return posts


if __name__ == "__main__":
    import argparse

    base_dir = Path(__file__).resolve().parent.parent
    data_dir = base_dir / "data"

    default_html = data_dir / "saved_posts.html"
    default_json = data_dir / "reels.json"

    parser = argparse.ArgumentParser(description="Extract saved Instagram posts from HTML export to JSON.")
    parser.add_argument(
        "-i", "--input",
        dest="input_path",
        default=str(default_html),
        help=f"Path to saved_posts.html (default: {default_html})",
    )
    parser.add_argument(
        "-o", "--output",
        dest="output_path",
        default=str(default_json),
        help=f"Path to output reels.json (default: {default_json})",
    )

    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    extract_saved_posts(args.input_path, args.output_path)
