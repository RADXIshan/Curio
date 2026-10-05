"""
Embeddings manager for Curio.
Handles vector embeddings using Google GenAI (gemini-embedding-001),
caching, normalization, and fast cosine similarity matrix computations.
"""

import logging
import os
from pathlib import Path
import time
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Initialize GenAI Client
_client = None
try:
    from google import genai
    _client = genai.Client()
except Exception as e:
    logger.warning(f"Could not initialize GenAI client for embeddings: {e}")

EMBEDDING_MODEL = "gemini-embedding-001"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CACHE_FILE = DATA_DIR / "reel_embeddings.npz"

# In-memory storage for fast lookup
_EMBEDDINGS_MATRIX: Optional[np.ndarray] = None  # shape: (N, D), normalized
_REEL_IDS: List[str] = []
_REEL_ID_TO_INDEX: Dict[str, int] = {}
_QUERY_CACHE: Dict[str, np.ndarray] = {}  # LRU cache for query vectors
_IS_INDEXING: bool = False


def get_client():
    global _client
    if _client is None:
        try:
            from google import genai
            _client = genai.Client()
        except Exception as e:
            logger.error(f"GenAI Client initialization error: {e}")
    return _client


def prepare_reel_text(reel: Dict[str, Any]) -> str:
    """Format reel metadata into a concise, rich representation for embedding."""
    title = (reel.get("title") or "").strip()
    category = (reel.get("category") or "").strip()
    owner = reel.get("owner") or {}
    author = (owner.get("name") or owner.get("username") or "").strip()
    username = (owner.get("username") or "").strip()
    tags = " ".join(reel.get("hashtags") or [])
    caption = (reel.get("caption") or "").strip()
    if len(caption) > 500:
        caption = caption[:500]

    parts = []
    if title:
        parts.append(f"Title: {title}")
    if category:
        parts.append(f"Topic: {category}")
    if author or username:
        parts.append(f"Creator: {author} (@{username})")
    if tags:
        parts.append(f"Keywords: {tags}")
    if caption:
        parts.append(f"Details: {caption}")

    return "\n".join(parts)


def l2_normalize(matrix: np.ndarray) -> np.ndarray:
    """L2-normalize rows of a vector or 2D matrix."""
    if matrix.ndim == 1:
        norm = np.linalg.norm(matrix)
        return matrix / norm if norm > 1e-9 else matrix
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return matrix / norms


def load_cached_embeddings() -> bool:
    """Load pre-computed embeddings from disk if available."""
    global _EMBEDDINGS_MATRIX, _REEL_IDS, _REEL_ID_TO_INDEX
    if not CACHE_FILE.exists():
        return False

    try:
        data = np.load(CACHE_FILE, allow_pickle=True)
        vectors = data["vectors"].astype(np.float32)
        ids = list(data["ids"])

        if len(ids) == len(vectors) and len(ids) > 0:
            _REEL_IDS = ids
            _REEL_ID_TO_INDEX = {rid: i for i, rid in enumerate(ids)}
            _EMBEDDINGS_MATRIX = l2_normalize(vectors)
            logger.info(f"Loaded {len(ids)} embeddings from cache ({CACHE_FILE.name})")
            return True
    except Exception as e:
        logger.error(f"Failed to load cached embeddings: {e}")

    return False


def save_embeddings_cache(ids: List[str], vectors: np.ndarray):
    """Save embeddings and their corresponding IDs to compressed NPZ."""
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            CACHE_FILE,
            ids=np.array(ids, dtype=object),
            vectors=vectors.astype(np.float32),
        )
        logger.info(f"Saved {len(ids)} embeddings to {CACHE_FILE}")
    except Exception as e:
        logger.error(f"Failed to save embeddings cache: {e}")


def get_query_embedding(query: str) -> Optional[np.ndarray]:
    """Fetch or compute embedding for a search query, with memory caching and graceful fallback."""
    q_norm = query.strip().lower()
    if not q_norm:
        return None

    if q_norm in _QUERY_CACHE:
        return _QUERY_CACHE[q_norm]

    client = get_client()
    if not client:
        return None

    try:
        res = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=query,
        )
        if hasattr(res, "embeddings") and res.embeddings:
            vec = np.array(res.embeddings[0].values, dtype=np.float32)
        elif hasattr(res, "embedding") and res.embedding:
            vec = np.array(res.embedding.values, dtype=np.float32)
        else:
            return None

        normalized_vec = l2_normalize(vec)
        # Limit cache size to 256 queries
        if len(_QUERY_CACHE) > 256:
            _QUERY_CACHE.pop(next(iter(_QUERY_CACHE)))
        _QUERY_CACHE[q_norm] = normalized_vec
        return normalized_vec
    except Exception as e:
        logger.warning(f"Semantic query embedding skipped ({e}); using concept graph and lexical search.")
        return None


def compute_semantic_scores(query: str, reel_ids: Optional[List[str]] = None) -> Dict[str, float]:
    """
    Compute cosine similarity between query and saved reels.
    Returns a dict mapping reel_id -> score (0.0 to 1.0).
    """
    global _EMBEDDINGS_MATRIX, _REEL_IDS, _REEL_ID_TO_INDEX

    if _EMBEDDINGS_MATRIX is None:
        loaded = load_cached_embeddings()
        if not loaded or _EMBEDDINGS_MATRIX is None:
            return {}

    q_vec = get_query_embedding(query)
    if q_vec is None:
        return {}

    try:
        similarities = np.dot(_EMBEDDINGS_MATRIX, q_vec)
        scores: Dict[str, float] = {}
        target_set = set(reel_ids) if reel_ids is not None else None

        for idx, rid in enumerate(_REEL_IDS):
            if target_set is not None and rid not in target_set:
                continue
            sim = float(similarities[idx])
            norm_score = max(0.0, min(1.0, (sim + 0.1) / 1.1))
            scores[rid] = round(norm_score, 4)

        return scores
    except Exception as e:
        logger.error(f"Error computing dot product similarities: {e}")
        return {}


def index_reels(
    all_reels: List[Dict[str, Any]],
    batch_size: int = 10,
    max_items: Optional[int] = None,
    inter_batch_sleep: float = 1.0,
) -> int:
    """
    Generate and cache embeddings for all reels with checkpointing and rate limit handling.
    """
    global _EMBEDDINGS_MATRIX, _REEL_IDS, _REEL_ID_TO_INDEX, _IS_INDEXING
    if _IS_INDEXING:
        logger.info("Indexing is already in progress.")
        return len(_REEL_IDS)

    client = get_client()
    if not client:
        logger.error("Cannot index reels: GenAI client is not configured.")
        return 0

    _IS_INDEXING = True
    try:
        load_cached_embeddings()
        existing_vectors = list(_EMBEDDINGS_MATRIX) if _EMBEDDINGS_MATRIX is not None else []
        id_to_vec = {rid: vec for rid, vec in zip(_REEL_IDS, existing_vectors)}

        items_to_embed = [
            r for r in all_reels
            if r.get("id") and r.get("id") not in id_to_vec
        ]

        if max_items:
            items_to_embed = items_to_embed[:max_items]

        if not items_to_embed and len(_REEL_IDS) > 0:
            logger.info("All reels already indexed.")
            return len(_REEL_IDS)

        logger.info(f"Indexing {len(items_to_embed)} new reels into vector embeddings...")

        total_batches = (len(items_to_embed) + batch_size - 1) // batch_size
        batch_idx = 0
        i = 0

        while i < len(items_to_embed):
            chunk = items_to_embed[i : i + batch_size]
            texts = [prepare_reel_text(r) for r in chunk]
            chunk_ids = [r.get("id") for r in chunk]
            batch_idx += 1

            try:
                res = client.models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=texts,
                )
                if hasattr(res, "embeddings") and res.embeddings:
                    for rid, emb in zip(chunk_ids, res.embeddings):
                        vec = np.array(emb.values, dtype=np.float32)
                        id_to_vec[rid] = vec

                # Checkpoint save after every batch!
                current_ids = [r.get("id") for r in all_reels if r.get("id") in id_to_vec]
                current_vecs = np.array([id_to_vec[rid] for rid in current_ids], dtype=np.float32)
                _REEL_IDS = current_ids
                _REEL_ID_TO_INDEX = {rid: idx for idx, rid in enumerate(current_ids)}
                _EMBEDDINGS_MATRIX = l2_normalize(current_vecs)
                save_embeddings_cache(current_ids, current_vecs)

                logger.info(f"Embedded & saved batch {batch_idx}/{total_batches} ({len(id_to_vec)}/{len(all_reels)} total)")
                i += batch_size
                time.sleep(inter_batch_sleep)
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    logger.warning(f"Rate limit reached on batch {batch_idx}. Waiting 35 seconds before retry...")
                    time.sleep(35.0)
                    # Retry this same batch without advancing i
                else:
                    logger.error(f"Error embedding batch {batch_idx}: {e}")
                    i += batch_size
                    time.sleep(2.0)

        logger.info(f"Vector indexing finished. Total items in cache: {len(_REEL_IDS)}")
        return len(_REEL_IDS)
    finally:
        _IS_INDEXING = False
