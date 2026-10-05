"""
Intelligent Hybrid Search Engine for Curio.
Combines:
1. Google GenAI Vector Embeddings (Semantic Cosine Similarity)
2. Domain Concept & Meaning Graph (Concept expansions, synonyms, related terms)
3. Advanced Multi-Field Weighted Lexical Search (Title, Tags, Category, Creator, Caption)
4. Typo-Tolerant Fuzzy Matching & Stemming
5. Exact Phrase Matching & Relevance Scoring
"""

import difflib
import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from app.services.embeddings_manager import compute_semantic_scores

logger = logging.getLogger(__name__)

# --- CONCEPT & MEANING KNOWLEDGE GRAPH ---
# Maps key concepts to broad synonyms, related tools, methodologies, and subfields
CONCEPT_GRAPH: Dict[str, Dict[str, Any]] = {
    "ai": {
        "synonyms": [
            "artificial intelligence", "machine learning", "ml", "deep learning", "neural",
            "llm", "llms", "large language model", "agent", "agents", "genai", "generative ai",
            "transformer", "transformers", "rag", "embeddings", "vector", "prompt", "prompting",
            "openai", "chatgpt", "gpt", "claude", "gemini", "anthropic", "mistral", "ollama",
            "langchain", "langgraph", "crewai", "huggingface", "pytorch", "model weights", "inference"
        ],
        "category": "AI & Agents",
    },
    "agent": {
        "synonyms": [
            "ai agent", "autonomous", "tool use", "function calling", "langgraph", "crewai",
            "workflow", "decision server", "multi-agent", "reasoning", "state graph", "guardrails"
        ],
        "category": "AI & Agents",
    },
    "system design": {
        "synonyms": [
            "distributed systems", "backend", "architecture", "microservices", "scalability",
            "high availability", "load balancer", "caching", "cache", "redis", "kafka",
            "message queue", "pubsub", "postgres", "postgresql", "sql", "nosql", "sharding",
            "database", "databases", "concurrency", "rate limiting", "api gateway", "grpc"
        ],
        "category": "System Design & Backend",
    },
    "backend": {
        "synonyms": [
            "server", "api", "rest api", "grpc", "database", "sql", "postgres", "redis",
            "kafka", "golang", "go", "python", "node", "architecture", "microservices"
        ],
        "category": "System Design & Backend",
    },
    "dsa": {
        "synonyms": [
            "data structures", "algorithms", "algorithm", "leetcode", "neetcode", "striver",
            "binary tree", "graph", "dynamic programming", "dp", "big o", "time complexity",
            "sliding window", "two pointers", "sorting", "recursion", "coding interview",
            "online assessment", "oa", "coding test", "problem solving"
        ],
        "category": "DSA & Problem Solving",
    },
    "leetcode": {
        "synonyms": [
            "dsa", "algorithms", "coding interview", "problem solving", "binary tree",
            "dynamic programming", "dp", "striver", "neetcode", "oa"
        ],
        "category": "DSA & Problem Solving",
    },
    "frontend": {
        "synonyms": [
            "web", "react", "nextjs", "next.js", "javascript", "typescript", "css", "tailwind",
            "ui", "ux", "user interface", "dom", "component", "vite", "html", "animation",
            "vue", "angular", "responsive", "svg", "three.js"
        ],
        "category": "Web & Frontend",
    },
    "react": {
        "synonyms": ["frontend", "javascript", "typescript", "nextjs", "next.js", "ui", "tailwind", "hooks"],
        "category": "Web & Frontend",
    },
    "devops": {
        "synonyms": [
            "docker", "kubernetes", "k8s", "containers", "ci/cd", "continuous integration",
            "cloud", "aws", "gcp", "azure", "terraform", "linux", "bash", "shell",
            "terminal", "git", "github actions", "nginx", "infrastructure", "networking"
        ],
        "category": "DevOps & Cloud",
    },
    "docker": {
        "synonyms": ["containers", "containerization", "kubernetes", "k8s", "devops", "images", "dockerfile"],
        "category": "DevOps & Cloud",
    },
    "kubernetes": {
        "synonyms": ["k8s", "docker", "containers", "orchestration", "pods", "devops", "cloud"],
        "category": "DevOps & Cloud",
    },
    "security": {
        "synonyms": [
            "cybersecurity", "dfir", "digital forensics", "soc", "blue team", "red team",
            "threat hunting", "logs", "audit", "siem", "sigma", "chainsaw", "incident response"
        ],
        "category": "DevOps & Cloud",
    },
    "career": {
        "synonyms": [
            "job", "jobs", "internship", "internships", "resume", "cv", "faang", "maang",
            "interview", "interview prep", "hired", "salary", "cs major", "college",
            "student", "portfolio", "referral", "hiring"
        ],
        "category": "Career & Internships",
    },
    "internship": {
        "synonyms": ["job", "career", "college", "student", "resume", "interview", "oa", "cs major"],
        "category": "Career & Internships",
    },
    "repo": {
        "synonyms": [
            "github", "repos", "repository", "open source", "oss", "devtools", "tools",
            "libraries", "packages", "extension", "vscode", "terminal", "utilities"
        ],
        "category": "Dev Tools & Repos",
    },
    "github": {
        "synonyms": ["repo", "repos", "open source", "git", "devtools", "code"],
        "category": "Dev Tools & Repos",
    },
    "research": {
        "synonyms": [
            "paper", "papers", "research papers", "arxiv", "academic", "study", "studies",
            "scientists", "scientific", "experiment", "findings", "reading papers", "stanford"
        ],
        "category": "AI & Agents",
    },
    "paper": {
        "synonyms": ["research", "research papers", "arxiv", "academic", "study", "machine learning research"],
        "category": "AI & Agents",
    },
    "productivity": {
        "synonyms": [
            "habits", "habit", "discipline", "focus", "kaizen", "ikigai", "wabi-sabi",
            "kintsugi", "procrastination", "mindset", "routine", "time management",
            "learning", "energy", "mental clarity"
        ],
        "category": "Productivity & Learning",
    },
    "habit": {
        "synonyms": ["productivity", "discipline", "routine", "kaizen", "focus", "consistency"],
        "category": "Productivity & Learning",
    },
    "kaizen": {
        "synonyms": ["habits", "productivity", "discipline", "focus", "ikigai", "small steps", "mindset"],
        "category": "Productivity & Learning",
    },
    "python": {
        "synonyms": [
            "pandas", "numpy", "datascience", "data science", "jupyter", "matplotlib",
            "seaborn", "scikit", "scikit-learn", "data analysis", "bioinformatics"
        ],
        "category": "Python & Data Science",
    },
}

# Stopwords to filter out from pure keyword matching
STOP_WORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can", "cannot", "could", "did", "do", "does", "doing", "down", "during", "each",
    "few", "for", "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers",
    "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself",
    "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
    "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so",
    "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there",
    "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would",
    "you", "your", "yours", "yourself", "yourselves", "show", "give", "find", "get", "need", "want"
}


def simple_stem(word: str) -> str:
    """Normalize simple English plurals and endings for higher recall."""
    w = word.lower().strip()
    if len(w) > 4:
        if w.endswith("ies"):
            return w[:-3] + "y"
        if w.endswith("sses"):
            return w[:-2]
        if w.endswith("ing") and len(w) > 5:
            return w[:-3]
        if w.endswith("ed") and len(w) > 4:
            return w[:-2]
        if w.endswith("s") and not w.endswith("ss"):
            return w[:-1]
    return w


def extract_query_concepts(query: str) -> Tuple[List[str], Set[str], Optional[str]]:
    """
    Extracts raw keywords, expanded semantic concepts, and inferred category from user query.
    """
    q_clean = re.sub(r"[^\w\s\-\#\.]", " ", query.lower()).strip()
    raw_tokens = [t for t in q_clean.split() if t]
    significant_tokens = [t for t in raw_tokens if t not in STOP_WORDS and len(t) > 1]

    expanded_concepts: Set[str] = set()
    inferred_category: Optional[str] = None

    # Check for direct concept matches or phrase matches
    q_str = f" {q_clean} "
    for concept, data in CONCEPT_GRAPH.items():
        if f" {concept} " in q_str:
            expanded_concepts.add(concept)
            expanded_concepts.update(data["synonyms"])
            if not inferred_category and "category" in data:
                inferred_category = data["category"]

        # Check synonyms
        for syn in data["synonyms"]:
            if f" {syn} " in q_str:
                expanded_concepts.add(concept)
                expanded_concepts.add(syn)
                if not inferred_category and "category" in data:
                    inferred_category = data["category"]

    # Also check individual words
    for token in significant_tokens:
        stemmed = simple_stem(token)
        for concept, data in CONCEPT_GRAPH.items():
            if stemmed == concept or stemmed == simple_stem(concept):
                expanded_concepts.add(concept)
                expanded_concepts.update(data["synonyms"][:6])
                if not inferred_category and "category" in data:
                    inferred_category = data["category"]

    return significant_tokens, expanded_concepts, inferred_category


def fuzzy_match_token(token: str, text: str, threshold: float = 0.85) -> bool:
    """Fuzzy matching for typo tolerance on words longer than 4 chars."""
    if len(token) < 4:
        return False
    # Quick prefix check
    token_len = len(token)
    words = text.split()
    for w in words:
        if abs(len(w) - token_len) <= 2:
            ratio = difflib.SequenceMatcher(None, token, w).ratio()
            if ratio >= threshold:
                return True
    return False


def score_reel_lexical_and_concept(
    reel: Dict[str, Any],
    query: str,
    raw_tokens: List[str],
    expanded_concepts: Set[str],
    inferred_category: Optional[str],
) -> Tuple[float, List[str], List[str]]:
    """
    Computes an advanced lexical, concept, and structural match score for a single reel.
    Returns: (score, match_reasons, matched_terms)
    """
    title = (reel.get("title") or "").lower()
    caption = (reel.get("caption") or "").lower()
    category = (reel.get("category") or "").lower()
    owner = reel.get("owner") or {}
    owner_name = (owner.get("name") or "").lower()
    owner_user = (owner.get("username") or "").lower()
    hashtags = [h.lower().lstrip("#") for h in (reel.get("hashtags") or [])]
    tags_str = " ".join(hashtags)

    score = 0.0
    matched_terms: Set[str] = set()
    match_reasons: List[str] = []

    q_lower = query.strip().lower()

    # 1. Exact Full Query Phrase Match (Massive Bonus)
    if q_lower:
        if q_lower in title:
            score += 35.0
            match_reasons.append(f"Exact query matches title")
            matched_terms.add(q_lower)
        elif q_lower in caption:
            score += 20.0
            match_reasons.append("Exact query matches caption")
            matched_terms.add(q_lower)
        elif q_lower in category:
            score += 18.0
            match_reasons.append(f"Matches category: {reel.get('category')}")
            matched_terms.add(q_lower)
        elif q_lower in tags_str:
            score += 18.0
            match_reasons.append("Exact query matches tags")
            matched_terms.add(q_lower)

    # 2. Token Matching with Field Weights
    # Title: 7.0, Tags: 5.0, Category: 4.0, Creator: 3.5, Caption: 2.0
    matched_token_count = 0
    for token in raw_tokens:
        token_stem = simple_stem(token)
        token_matched = False

        # In Title
        if token in title or token_stem in title:
            score += 8.0
            token_matched = True
            matched_terms.add(token)
        # In Hashtags
        elif any(token == h or token_stem == simple_stem(h) for h in hashtags):
            score += 6.0
            token_matched = True
            matched_terms.add(token)
        # In Category
        elif token in category or token_stem in category:
            score += 5.0
            token_matched = True
            matched_terms.add(token)
        # In Creator
        elif token in owner_name or token in owner_user:
            score += 4.5
            token_matched = True
            matched_terms.add(token)
        # In Caption
        elif token in caption or token_stem in caption:
            score += 2.5
            token_matched = True
            matched_terms.add(token)
        # Typo / Fuzzy tolerance on title and tags
        elif fuzzy_match_token(token, title, threshold=0.82):
            score += 5.0
            token_matched = True
            matched_terms.add(token)
            match_reasons.append(f"Close spelling match for '{token}' in title")
        elif fuzzy_match_token(token, tags_str, threshold=0.82):
            score += 4.0
            token_matched = True
            matched_terms.add(token)

        if token_matched:
            matched_token_count += 1

    # Completeness bonus: Did the reel match multiple/all query tokens?
    if len(raw_tokens) > 1 and matched_token_count > 0:
        coverage = matched_token_count / len(raw_tokens)
        if coverage == 1.0:
            score += 15.0  # All query words present!
            match_reasons.append("Matches all query keywords")
        elif coverage >= 0.5:
            score += 6.0 * coverage

    # 3. Concept Graph & Meaning Matches
    concept_hits = 0
    for concept in expanded_concepts:
        c_stem = simple_stem(concept)
        if concept in title or c_stem in title:
            score += 4.0
            concept_hits += 1
            matched_terms.add(concept)
        elif any(concept == h or c_stem == simple_stem(h) for h in hashtags):
            score += 3.5
            concept_hits += 1
            matched_terms.add(concept)
        elif concept in category:
            score += 3.0
            concept_hits += 1
            matched_terms.add(concept)
        elif concept in caption:
            score += 1.5
            concept_hits += 1
            matched_terms.add(concept)

    if concept_hits > 0:
        match_reasons.append(f"Concept match ({concept_hits} related terms)")

    # 4. Inferred Category Boost
    if inferred_category and reel.get("category") == inferred_category:
        score += 8.0
        match_reasons.append(f"Related domain: {inferred_category}")

    # Deduplicate match reasons
    unique_reasons = []
    seen = set()
    for r in match_reasons:
        if r not in seen:
            seen.add(r)
            unique_reasons.append(r)

    return score, unique_reasons, sorted(list(matched_terms))


def smart_search_reels(
    query: str,
    all_reels: List[Dict[str, Any]],
    min_score_threshold: float = 3.0,
    enable_ai_embeddings: bool = True,
) -> List[Dict[str, Any]]:
    """
    Executes hybrid search across all reels using:
    - AI vector embeddings (semantic meaning & similar concepts)
    - Domain concept graph (synonyms & related technical areas)
    - Typo-tolerant multi-field weighted lexical matching
    """
    clean_query = query.strip()
    if not clean_query:
        return all_reels

    # 1. Parse Query & Concept Expansion
    raw_tokens, expanded_concepts, inferred_category = extract_query_concepts(clean_query)

    # 2. Get AI Vector Embeddings Cosine Similarities (if available)
    semantic_scores: Dict[str, float] = {}
    if enable_ai_embeddings:
        try:
            semantic_scores = compute_semantic_scores(clean_query)
        except Exception as e:
            logger.warning(f"Semantic scoring unavailable: {e}")

    # 3. Score every reel with Hybrid Fusion
    scored_items: List[Tuple[float, Dict[str, Any]]] = []

    for r in all_reels:
        rid = r.get("id")
        lexical_score, reasons, matched_terms = score_reel_lexical_and_concept(
            r,
            clean_query,
            raw_tokens,
            expanded_concepts,
            inferred_category,
        )

        sem_score = semantic_scores.get(rid, 0.0)

        # Hybrid Fusion Formula:
        # lexical_score typically ranges from 0 to 60+
        # sem_score ranges from 0.0 to 1.0 (cosine similarity)
        # Convert semantic score to a 0..40 scale bonus
        semantic_boost = 0.0
        if sem_score > 0.45:
            # Significant semantic similarity detected
            semantic_boost = (sem_score - 0.45) * 60.0
            reasons.append(f"AI Semantic Match ({int(sem_score * 100)}%)")

        total_score = lexical_score + semantic_boost

        if total_score >= min_score_threshold or sem_score > 0.60:
            # Attach search metadata to a lightweight clone of the item
            enriched_item = dict(r)
            enriched_item["_search_meta"] = {
                "score": round(total_score, 2),
                "semantic_score": round(sem_score, 3) if sem_score > 0 else None,
                "match_reasons": reasons[:3],
                "matched_terms": matched_terms[:8],
            }
            scored_items.append((total_score, enriched_item))

    # Sort descending by total score
    scored_items.sort(key=lambda x: x[0], reverse=True)

    return [item[1] for item in scored_items]


def get_search_suggestions(
    query: str,
    all_reels: List[Dict[str, Any]],
    limit: int = 6,
) -> Dict[str, Any]:
    """
    Provides real-time AI and lexical search suggestions, related categories, and creator tags.
    """
    q = query.strip().lower()
    if not q:
        return {
            "suggestions": [],
            "related_categories": [],
        }

    suggestions = []
    seen = set()

    # 1. Concept Graph matches
    for concept, data in CONCEPT_GRAPH.items():
        if q in concept or any(q in syn for syn in data["synonyms"]):
            display = concept.title()
            if display not in seen:
                seen.add(display)
                suggestions.append({"text": display, "type": "concept", "category": data.get("category")})
            for syn in data["synonyms"][:3]:
                if q in syn and syn.title() not in seen:
                    seen.add(syn.title())
                    suggestions.append({"text": syn.title(), "type": "synonym", "category": data.get("category")})

    # 2. Check Matching Reel Titles
    for r in all_reels:
        title = r.get("title") or ""
        if q in title.lower() and title not in seen:
            seen.add(title)
            suggestions.append({"text": title, "type": "title", "category": r.get("category")})
            if len(suggestions) >= limit:
                break

    # 3. Check Matching Tags
    for r in all_reels:
        for tag in r.get("hashtags", []):
            clean_t = tag.lstrip("#").lower()
            if q in clean_t and f"#{clean_t}" not in seen:
                seen.add(f"#{clean_t}")
                suggestions.append({"text": f"#{clean_t}", "type": "tag"})
                if len(suggestions) >= limit:
                    break

    # 4. Related Categories
    matched_cats = []
    for r in all_reels:
        cat = r.get("category")
        if cat and cat not in matched_cats:
            if q in cat.lower() or any(q in t.lower() for t in r.get("hashtags", [])):
                matched_cats.append(cat)

    return {
        "suggestions": suggestions[:limit],
        "related_categories": matched_cats[:4],
    }
