"""
CLI and convenience runner to extract saved posts from saved_posts.html to reels.json.
Delegates to app.services.extractor.
"""

import sys
from pathlib import Path

# Ensure backend root is the primary import root so 'app' is recognized as a package
app_dir = Path(__file__).resolve().parent
backend_dir = app_dir.parent

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(app_dir) in sys.path:
    sys.path.remove(str(app_dir))

from app.services.extractor import extract_saved_posts

if __name__ == "__main__":
    import argparse
    import logging

    data_dir = app_dir / "data"
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
