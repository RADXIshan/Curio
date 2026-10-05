"""
Script to pre-compute and cache vector embeddings for all saved reels.
Saves to backend/app/data/reel_embeddings.npz.
"""

import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.reels_service import load_reels
from app.services.embeddings_manager import index_reels

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def main():
    reels = load_reels()
    print(f"Starting vector indexing for {len(reels)} reels...")
    count = index_reels(reels, batch_size=15)
    print(f"Indexing complete! Total {count} reels indexed.")

if __name__ == "__main__":
    main()
