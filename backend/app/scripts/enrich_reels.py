"""
Enrichment script for Curio saved posts dataset.
1. Populates AI-generated captions and tags for posts with missing captions.
2. Derives clean, content-focused titles for all 448 reels/posts (eliminates "Comment for...", clickbait, emojis).
3. Ensures valid categories and flags caption_generated=True where AI generated the caption.
"""

import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
JSON_PATH = DATA_DIR / "reels.json"

GENERATED_CAPTIONS = {
    "Dc6Fhx4JPHW": {
        "title": "Caching Strategies for Scalable Backend Microservices",
        "caption": "In high-throughput distributed systems, effective caching is the single most critical factor in slashing database load and decreasing latency. This guide analyzes the architectural tradeoffs between Cache-Aside, Write-Through, and Write-Back (Write-Behind) patterns implemented with Redis and Memcached.\n\nWith Cache-Aside, the application directly orchestrates querying the cache and fallback to the database, making it resilient but prone to stale data if TTLs are misconfigured. For write-heavy systems requiring strong consistency, Write-Through updates both the cache and database synchronously, which increases write latency but guarantees consistency. Alternatively, Write-Back writes to the cache instantly and flushes to the database asynchronously, offering maximum write performance.\n\nWhen designing your system architecture, evaluate your read-to-write ratio and tolerance for eventual consistency. Use Cache-Aside for standard read-heavy applications like user profiles, and reserved Write-Back patterns for high-throughput logging or real-time analytics.",
        "category": "System Design & Backend",
        "hashtags": ["systemdesign", "backenddevelopment", "caching", "redis", "microservices"],
        "caption_generated": True
    },
    "DdQS2d8KMPh": {
        "title": "Building Autonomous AI Agents with Tool Calling",
        "caption": "Moving beyond basic LLM prompt-and-response paradigms requires building autonomous agents capable of tool use, external API execution, and iterative reasoning. By giving models structured schemas for calculators, databases, and web searchers, the agent can decide dynamically when and how to call tools, inspect the returned payloads, and loop until the objective is accomplished.\n\nTo build these systems reliably, developers leverage tools like LangGraph, CrewAI, or native function calling APIs from Google Gemini and Anthropic. Defining strict execution boundaries using Pydantic models for argument validation is crucial to prevent runtime crashes caused by malformed LLM outputs. Additionally, maintaining a clear state graph allows you to handle complex multi-step reasoning loops.\n\nKey engineering takeaways for productionizing agentic workflows include implementing robust error-handling loops for hallucinations, enforcing rate-limiting on external APIs, and always establishing a human-in-the-loop guardrail for destructive actions like database writes or financial transactions.",
        "category": "AI & Agents",
        "hashtags": ["AIEngineering", "LLMs", "AIAgents", "SystemDesign", "SoftwareEngineering"],
        "caption_generated": True
    },
    "DZyT38iTmXI": {
        "title": "Optimizing Developer Workspace Ergonomics & Deep Work Flow",
        "caption": "A well-engineered developer workstation is an investment in long-term engineering longevity, posture health, and cognitive endurance. Ergonomics begins with mechanical alignment: positioning your primary monitor at eye level to prevent cervical spine compression and choosing an ergonomic mechanical keyboard to protect against repetitive strain injuries (RSI).\n\nLighting plays a critical role in reducing eye fatigue during deep-work sprints. By combining a high-CRI monitor light bar to illuminate the physical workspace with soft bias lighting behind the display, you eliminate glare and minimize contrast-induced eye strain. Integrating tactile elements like a premium desk mat and warm ambient lighting helps lower cognitive load, keeping you in the flow state longer.\n\nTo audit your current setup, prioritize the 90-degree rule: your elbows, hips, and knees should remain at right angles, and the top of your primary IDE monitor should sit at or slightly below eye level. Decluttering your workspace by routing cables beneath the desk and utilizing wireless peripherals reduces visual noise.",
        "category": "Dev Tools & Open Source",
        "hashtags": ["developersetup", "codingdesk", "workspaceergonomics", "programmerlife", "setupinspiration"],
        "caption_generated": True
    },
    "DYOGwYYJzcy": {
        "title": "Full-Stack Spring Boot & Microservices Interview Roadmap",
        "caption": "Mastering the Java and Spring ecosystem requires understanding modern enterprise architectures, from modular monoliths to cloud-native microservices. In production, knowing how to wire Spring Boot controllers and inject JPA repositories is only the first step. You must also learn how to integrate caching layers like Redis, handle asynchronous communication using message brokers like Apache Kafka or RabbitMQ, and transition into scalable microservices.\n\nImplementing Spring Cloud components (such as API Gateways and Eureka Service Discovery) along with containerization tools like Docker will elevate your architecture skills from junior to senior levels. Implementing resilient circuit breakers with Resilience4j ensures graceful degradation under peak traffic.\n\nTo ace coding interviews, balance your preparation between Data Structures & Algorithms (DSA) and system design. Practice designing highly available, fault-tolerant systems, and be ready to explain Spring Boot-specific interview questions—such as bean lifecycles, custom annotations, transactional propagation levels, and securing endpoints using Spring Security and JWT.",
        "category": "System Design & Backend",
        "hashtags": ["springboot", "backenddevelopment", "javadeveloper", "systemdesign", "codinginterview"],
        "caption_generated": True
    },
    "DXikCIggAIT": {
        "title": "Automating Developer Workflows with AI & Structured Prompts",
        "caption": "Generative AI is shifting from conversational novelty into a deterministic productivity multiplier for software engineers. The key to unlocking reliable LLM code generation lies in structured prompting techniques: Few-Shot Prompting, Chain-of-Thought (CoT) reasoning, and System Role conditioning. By providing clear inputs, expected output schemas (like JSON or Pydantic definitions), and edge-case examples, you eliminate ambiguous outputs and generate production-ready code.\n\nModern developer workflows integrate LLMs directly into IDEs and CI/CD pipelines via CLI agents like Claude Code, Cursor, and Gemini interactions. Automating routine engineering tasks—such as generating comprehensive unit test suites with pytest or Jest, drafting OpenAPI specifications from raw code, and summarizing git pull requests—saves hours of manual context-switching each week.\n\nBest practices for AI-augmented development: never commit AI-generated code without manual review and automated test validation, enforce linter and static analysis passes, and treat prompts like code by version-controlling them in your repository.",
        "category": "AI & Agents",
        "hashtags": ["promptengineering", "generativeai", "developerproductivity", "llmops", "codingautomation"],
        "caption_generated": True
    },
    "DVrKrGdFEGM": {
        "title": "Dynamic UI Interactions with CSS Variables and JavaScript",
        "caption": "Elevating user experience often comes down to the fluid responsiveness of micro-interactions. This technique leverages the power of CSS Custom Properties (variables) updated dynamically via JavaScript event listeners. By binding mouse coordinates or scroll states directly to CSS variables, you can create highly interactive, physics-based visual effects without the overhead of heavy animation libraries. The separation of concerns remains clean: JavaScript handles the state calculation, while CSS handles the rendering and transitions.\n\nFrom a performance standpoint, this approach is exceptionally efficient. By animating only composited properties like 'transform' and 'opacity', you avoid costly layout repaints and reflows. Adding 'will-change' hints to animated elements signals the browser to promote them to their own compositor layers, leveraging GPU acceleration to ensure your UI elements glide smoothly at 60fps even on lower-end devices.\n\nWhile robust animation frameworks have their place, mastering this native CSS/JS hybrid approach is a game-changer for landing page hero sections, interactive card designs, and custom cursors. It keeps your bundle size minimal and your pages loading instantly.",
        "category": "Web & Frontend",
        "hashtags": ["cssanimations", "frontenddev", "javascript", "webperformance", "uidesign"],
        "caption_generated": True
    },
    "DUibnZOCRuS": {
        "title": "Architecting a Lean Tech Stack for Rapid Product Shipping",
        "caption": "Modern software development is often bogged down by over-engineering and tool sprawl. To maintain high developer velocity, successful engineers rely on a streamlined, highly cohesive tech stack that minimizes boilerplate and reduces cognitive load. Choosing a unified language environment—like TypeScript across both your frontend and backend—allows you to share types seamlessly, catch errors during build time, and deploy features significantly faster.\n\nBy combining Next.js for robust routing, Tailwind CSS for utility-first styling, and a managed PostgreSQL instance via Supabase, you establish an instant, type-safe architecture. Integrating a modern ORM like Prisma or Drizzle further simplifies your database operations with automated schema migrations. Organizing your codebase using a feature-based folder structure rather than a layer-based one ensures that your architecture remains maintainable as your application scales.\n\nThe ultimate goal is to eliminate friction between writing code and delivering value to users. Automating repetitive tasks with strict ESLint rules, Prettier formatting, and robust CI/CD pipelines frees up your mental bandwidth to focus on solving core business logic.",
        "category": "Dev Tools & Open Source",
        "hashtags": ["developerproductivity", "cleancode", "techstack", "webdevelopment", "softwarearchitecture"],
        "caption_generated": True
    },
    "DT0rYongRWQ": {
        "title": "Essential Python Tricks & Idiomatic Patterns for Data Science",
        "caption": "Writing idiomatic Python is essential for building scalable data pipelines and performant backend services. This guide covers core Python patterns that every developer should master—from leveraging generator expressions and list comprehensions to reduce memory overhead, to utilizing the itertools and collections standard library modules for optimized data transformations.\n\nWhen handling complex data structures, adopting modern Python features like structural pattern matching (match/case), dataclasses for clean type schemas, and context managers (with statements) for automatic resource cleanup makes your codebase significantly more robust and self-documenting. For data science workloads, pairing pure Python algorithms with vectorized NumPy operations provides orders of magnitude speedups.\n\nKey takeaways include avoiding common anti-patterns like modifying a list while iterating over it, replacing deep nested dictionaries with defaultdict or typed NamedTuple, and always profiling hot execution paths using cProfile and timeit before attempting premature optimization.",
        "category": "Python & Data Science",
        "hashtags": ["python", "datascience", "pythonprogramming", "cleancode", "algorithms"],
        "caption_generated": True
    },
    "DSRUdR_Ek79": {
        "title": "Full-Stack Web Development & Career Acceleration Masterclass",
        "caption": "Breaking into full-stack software engineering requires more than just memorizing syntax—it demands building production-grade applications that solve real-world problems. In this masterclass session, we break down the end-to-end modern web stack: mastering modern JavaScript/ES6+, building reactive components with React, designing resilient RESTful and GraphQL APIs, and integrating SQL/NoSQL databases with proper authentication and state management.\n\nBeyond technical codebases, a major focus is placed on the engineering hiring process: how to construct an ATS-optimized software developer resume, showcase impact-driven GitHub project portfolios, and communicate system architecture clearly during technical interview rounds. Understanding how to articulate engineering tradeoffs between client-side and server-side rendering is what differentiates junior applicants from top-tier candidates.\n\nActionable steps for engineers: build and deploy at least two full-stack projects with live authentication and CI/CD pipelines, document your architectural decisions in README files, and actively participate in open-source discussions to gain peer review experience.",
        "category": "Career & Internships",
        "hashtags": ["webdevelopment", "fullstack", "reactjs", "careeradvice", "techinterview"],
        "caption_generated": True
    }
}

# Regex to detect creator engagement bait / CTAs
CLICKBAIT_PATTERNS = [
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*comment\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*dm\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*follow\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*save\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*share\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*link in bio\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*drop a\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*type\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*want the\b',
    r'^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|\u2022|\s)*send me\b',
]

SPECIFIC_CTA_TRANSFORMS = [
    (r'(?i)comment\s+["“\']?git["”\']?\s+to\s+get\s+(?:the\s+)?(?:full\s+)?pdf\s+guide', 'Complete Git & Version Control PDF Guide'),
    (r'(?i)comment\s+["“\']?agent["”\']?\s+for\s+(?:the\s+)?setup\s+guide', 'AI Agent Architecture & Setup Guide'),
    (r'(?i)comment\s+["“\']?exam["”\']?\s+and\s+i[\'’]?ll\s+send\s+over\s+all\s+(?:the\s+)?links', 'Tech & Coding Exam Preparation Resources'),
    (r'(?i)comment\s+["“\']?google["”\']?\s+and\s+i[\'’]?ll\s+send\s+over\s+all\s+(?:the\s+)?links', 'Google Developer Tools & Learning Resources'),
    (r'(?i)comment\s+["“\']?ai["”\']?\s+to\s+get\s+(?:the\s+)?link', 'Building Neural Networks & Perceptrons from Scratch'),
    (r'(?i)comment\s+["“\']?python["”\']?\s+to\s+get\s+(?:the\s+)?links', '5 Practical Python Projects for Real-World Skills'),
    (r'(?i)comment\s+["“\']?repo["”\']?\s+and\s+i[\'’]?ll\s+send\s+you\s+all\s+5\s+links', '5 Essential GitHub Repositories for Developers'),
    (r'(?i)comment\s+["“\']?games["”\']?\s+and\s+i[\'’]?ll\s+send\s+you\s+all\s+the\s+links', 'Interactive Coding Games to Master AI & Reinforcement Learning'),
    (r'(?i)comment\s+["“\']?system["”\']?\s+for\s+(?:the\s+)?(?:full\s+)?guide', 'System Design Interview & Architecture Guide'),
    (r'(?i)comment\s+["“\']?code["”\']?\s+for\s+(?:the\s+)?source\s+code', 'Source Code & Project Implementation Guide'),
    (r'(?i)comment\s+["“\']?roadmap["”\']?\s+for\s+(?:the\s+)?guide', 'Complete Software Engineering Learning Roadmap'),
]


def clean_leading_junk(text: str) -> str:
    """Strip emojis, bullets, and numbers from line starts."""
    return re.sub(r'^[•\-\*👉✔️✅🚀🔥⚡💡📌👇💬😎❤️\d\.\)\s]+', '', text).strip()


def derive_content_title(caption: str, owner: dict = None, category: str = None) -> str:
    """
    Intelligently derive an informative, substantive title describing what the content is about.
    Avoids clickbait like 'Comment for...', 'Save this post', emojis, etc.
    """
    if not caption or not caption.strip():
        owner_name = (owner or {}).get("name") or (owner or {}).get("username") or "Resource"
        cat = category or "General Tech"
        return f"{owner_name}: {cat} Guide"

    # Check for direct CTA transforms first
    first_few = caption[:300]
    for pattern, replacement in SPECIFIC_CTA_TRANSFORMS:
        if re.search(pattern, first_few):
            owner_u = (owner or {}).get("username")
            return f"{replacement} (@{owner_u})" if owner_u and len(replacement) < 55 else replacement

    lines = [l.strip() for l in caption.split("\n") if l.strip()]

    # Check lines in order to find the core subject line
    candidate = None
    for line in lines:
        cleaned = clean_leading_junk(line)
        if not cleaned:
            continue
        # Skip pure hashtags or URLs
        if cleaned.startswith("#") or cleaned.startswith("http") or cleaned.startswith("www."):
            continue
        # Skip lines that are clickbait/CTAs
        is_clickbait = any(re.search(p, cleaned, re.IGNORECASE) for p in CLICKBAIT_PATTERNS)
        if is_clickbait:
            continue
        # If line is too short (e.g. 'Read below:', 'Part 1:'), skip if we have more text
        if len(cleaned) < 10 and len(lines) > 2:
            continue
        
        # Check if line contains a strong summary/header
        candidate = cleaned
        break

    if not candidate:
        # Try finding a bullet point or substantive line anywhere
        for line in lines:
            cleaned = clean_leading_junk(line)
            if len(cleaned) > 15 and not cleaned.startswith("#") and not cleaned.startswith("http"):
                candidate = cleaned
                break

    if not candidate and lines:
        candidate = clean_leading_junk(lines[0])

    if candidate:
        # Clean out inline CTAs from the end
        candidate = re.sub(r'(?i)(?:👉|👇)?\s*(?:follow|comment|dm|save|share|link in bio).*$', '', candidate).strip()
        candidate = clean_leading_junk(candidate)
        candidate = re.sub(r'[•\-\*👉✔️✅🚀🔥⚡💡📌👇💬😎❤️]+$', '', candidate).strip()

        # Format and truncate nicely at word boundary
        if len(candidate) > 75:
            truncated = candidate[:72]
            last_space = truncated.rfind(' ')
            if last_space > 35:
                candidate = truncated[:last_space] + '...'
            else:
                candidate = truncated + '...'
        if len(candidate) > 4:
            return candidate

    owner_u = (owner or {}).get("username") or "Creator"
    return f"{owner_u}: {category or 'Tech Guide'}"


def enrich_dataset():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        reels = json.load(f)

    updated_count = 0
    ai_captions_count = 0

    for r in reels:
        rid = r.get("id")
        owner = r.get("owner") or {}
        cat = r.get("category")

        # 1. Fill missing caption if in generated dictionary
        if rid in GENERATED_CAPTIONS:
            gen = GENERATED_CAPTIONS[rid]
            r["caption"] = gen["caption"]
            r["title"] = gen["title"]
            r["category"] = gen["category"]
            r["hashtags"] = gen["hashtags"]
            r["caption_generated"] = True
            ai_captions_count += 1
            updated_count += 1
            continue

        # If caption was missing and not in dictionary, generate from fallback
        if not r.get("caption") or not r.get("caption").strip():
            u = owner.get("username") or owner.get("name") or "tech"
            r["caption"] = f"Educational programming and engineering post from @{u} covering {cat or 'software development'} best practices, architecture concepts, and developer workflows."
            r["title"] = f"{owner.get('name') or u}: {cat or 'Engineering Guide'}"
            r["caption_generated"] = True
            ai_captions_count += 1
            updated_count += 1
            continue

        # 2. Derive clean content-based title for all posts
        content_title = derive_content_title(r.get("caption"), owner, cat)
        r["title"] = content_title
        if "caption_generated" not in r:
            r["caption_generated"] = False
        updated_count += 1

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(reels, f, indent=2, ensure_ascii=False)

    print(f"Successfully enriched {len(reels)} items.")
    print(f"AI-generated captions added: {ai_captions_count}")
    print(f"Titles created/updated: {updated_count}")


if __name__ == "__main__":
    enrich_dataset()
