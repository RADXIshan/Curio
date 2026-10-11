<div align="center">

# ✦ CURIO

### *AI-Powered Knowledge Hub & Second Brain for Saved Instagram Reels & Posts*

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.142+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.1+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3+-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.5_Flash_Lite-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev)
[![Playwright](https://img.shields.io/badge/Playwright-Automated_Sync-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev)

<p align="center">
  <b>Turn your chaotic Instagram "Saved" tab into a structured, Notion-style second brain with automated synchronization, hybrid vector search, and grounded conversational AI.</b>
</p>

[Key Features](#-key-features) •
[Architecture](#-architecture--system-design) •
[Quickstart](#-quickstart--installation) •
[Hybrid Search Engine](#-intelligent-hybrid-search-engine) •
[API Reference](#-api-reference) •
[Sync Workflow](#-instagram-playwright-sync-workflow)

---

</div>

## 📌 Overview

Every engineer, designer, and tech enthusiast saves dozens of high-value Instagram reels: distributed systems breakdowns, open-source AI agent architectures, LeetCode patterns, interview roadmaps, and dev tool gems. 

However, Instagram's native "Saved" tab is a black hole:
* ❌ **No full-text or semantic search** across captions or topics.
* ❌ **No automated taxonomy or categorization**.
* ❌ **No synthesis** — valuable tips remain buried in clickbait reels and emoji-heavy captions.
* ❌ **No AI interaction** — you cannot query your saved collection conversationally.

**Curio** solves this. It ingests your saved Instagram posts and reels (via automated headless Playwright synchronization or native HTML export), extracts the raw media and metadata, enriches each item with **Google Gemini**, precomputes vector embeddings, and renders them in a Notion-inspired workspace equipped with a **grounded RAG AI chatbot**.

---

## ✨ Key Features

### 1. 🗂️ Notion-Style Interactive Workspace
* **Dual View Modes**: Switch seamlessly between a high-density **Gallery View** (rich cards with category pills, timestamps, and creator tags) and a structured **Table View** (database rows with sortable columns).
* **Deep Page Modal**: Inspect any reel with full metadata, cleaned caption formatting, direct Instagram permalinks, and one-click AI generation.
* **Instant Filtering & Tag Clouds**: Filter by post type (`reel` vs. `post`), creator handle, or any of the top trending hashtags.
* **Dark Aesthetics**: Crafted with a modern dark theme inspired by Notion and Linear.

### 2. 🧠 Grounded Gemini RAG Chatbot ("Chat with Curio")
* **Conversational Knowledge Retrieval**: Ask questions like:
  * *"What repositories or tools for autonomous AI agents did I save?"*
  * *"Show me caching strategies and Redis patterns from my saved posts."*
  * *"Find roadmaps for System Design and coding interviews."*
* **Grounded Citations**: Curio’s AI assistant answers queries grounded exclusively in your saved content, providing clickable cards directly to the cited reels.
* **Powered by Google Gemini 3.5 Flash Lite**: Fast response times with structured contextual synthesis.

### 3. 🔍 Intelligent Hybrid Search Engine
* **Semantic Vector Cosine Similarity**: Uses `gemini-embedding-001` embeddings cached in a compressed NumPy matrix (`reel_embeddings.npz`) for conceptual similarity.
* **Concept & Meaning Knowledge Graph**: Expands queries using domain synonyms (e.g., searching `"kafka"` automatically associates with `"message queue"`, `"pubsub"`, and `"System Design"`).
* **Multi-Field Weighted Lexical Matching**: Evaluates and weights matches across title, hashtags, category, author handle, and caption body.
* **Typo-Tolerant Fuzzy Matching**: Built-in difflib fuzzy matching and stemming to handle misspellings.
* **Live Search Autocomplete**: As-you-type search suggestions with categorized concept pills and query completions.

### 4. 📝 On-Demand & Automated AI Summaries
* **Structured Takeaways**: Automatically extracts:
  * **One-Line Summary**: High-level abstract of the reel's core value.
  * **Key Takeaways**: Bulleted engineering principles or takeaways.
  * **Resources Mentioned**: Repos, libraries, documentation links, or websites cited.
  * **Action Items**: Next steps or immediate implementation advice.
* **Automated Title Generation**: Cleans up clickbait captions (*"Comment 'CODE' to get the link!"*) into informative, content-focused titles.

### 5. 🔄 Automated Instagram Playwright Synchronization
* **Headless / Browser Automation**: Crawls `instagram.com/<user>/saved/` to detect new posts.
* **Stateful Sessions**: Preserves authentication state in `instagram_session.json` to prevent recurring logins.
* **Interactive 2FA / OTP Support**: Directly prompts for 2-Factor Authentication / OTP in the frontend modal with live streaming terminal logs.
* **Incremental Synchronization**: Only ingests posts saved after the most recent timestamp in your database.

---

## 🏗 Architecture & System Design

```
                     ┌────────────────────────────────────────┐
                     │          Instagram Saved Feed          │
                     └───────────────────┬────────────────────┘
                                         │
                   [Playwright Sync / HTML Archive Import]
                                         │
                                         ▼
                     ┌────────────────────────────────────────┐
                     │         FastAPI Backend (App)          │
                     │  - Extractor & Timestamp Normalizer    │
                     │  - Gemini Categorization & Title Clean │
                     └───────┬────────────────────────┬───────┘
                             │                        │
         [Vector Embedding]  │                        │  [Structured Storage]
                             ▼                        ▼
              ┌─────────────────────┐      ┌─────────────────────┐
              │ reel_embeddings.npz │      │     reels.json      │
              │ (gemini-embedding)  │      │ (490+ Curated Items)│
              └──────────┬──────────┘      └──────────┬──────────┘
                         │                            │
                         └──────────────┬─────────────┘
                                        │
                                        ▼
                     ┌────────────────────────────────────────┐
                     │      Intelligent Hybrid Search         │
                     │  - Semantic Cosine Similarity          │
                     │  - Domain Concept Knowledge Graph      │
                     │  - Weighted Lexical & Fuzzy Ranking    │
                     └──────────────────┬─────────────────────┘
                                        │
                         ┌──────────────┴─────────────┐
                         │                            │
                         ▼                            ▼
              ┌─────────────────────┐      ┌─────────────────────┐
              │  Gemini RAG Chat    │      │  React 19 Frontend  │
              │  (Context Grounding)│      │  (Notion UI / Vite) │
              └─────────────────────┘      └─────────────────────┘
```

---

## 🗂️ Taxonomy & Knowledge Domains

Curio automatically categorizes saved items into 11+ structured engineering and career domains:

| Category | Description | Sample Topics Covered |
| :--- | :--- | :--- |
| **AI & Agents** | LLMs, Agentic frameworks, prompting, fine-tuning | LangGraph, CrewAI, Transformers, RAG, Ollama, Claude, Gemini |
| **System Design & Backend** | Distributed systems, databases, architecture | Microservices, Redis Caching, Kafka, Postgres, Sharding, gRPC |
| **DSA & Problem Solving** | Algorithms, data structures, interview prep | LeetCode, Dynamic Programming, Graphs, Binary Trees, NeetCode |
| **Dev Tools & Repos** | Open-source utilities, productivity CLIs, cheatsheets | GitHub Repos, VS Code extensions, Terminal utilities, APIs |
| **DevOps & Cloud** | Infrastructure, containers, orchestration, CI/CD | Docker, Kubernetes, Terraform, AWS, Linux, GitHub Actions |
| **Career & Internships** | Job search, resume advice, salary negotiation | Tech interviews, FAANG hiring tips, student portfolios |
| **Web & Frontend** | Modern UI engineering, frameworks, animations | React 19, TypeScript, Tailwind CSS, Next.js, WebGL/Three.js |
| **Python & Data Science** | Data analysis, machine learning pipelines | NumPy, Pandas, Scikit-learn, PyTorch, Jupyter Notebooks |
| **Productivity & Learning** | Deep work, cognitive retention, learning habits | Active recall, Pomodoro, ergonomic workstations, habits |
| **Hackathons & Projects** | Real-world projects, pitch decks, demos | Smart India Hackathon (SIH), capstone project ideas, MVPs |
| **Health & Lifestyle** | Posture, desk ergonomics, fitness | Ergonomics, eye care, developer workspace optimization |

---

## 📂 Repository Structure

```
Curio/
├── backend/
│   ├── app/
│   │   ├── app.py                 # FastAPI application instance & lifespan handlers
│   │   ├── data/
│   │   │   ├── reels.json         # Primary knowledge base dataset (490+ posts)
│   │   │   ├── reel_embeddings.npz# Pre-computed NumPy vector embeddings
│   │   │   └── instagram_session.json # Persisted Playwright session state
│   │   ├── models/
│   │   │   ├── reels.py           # Pydantic data schemas (ReelItem, Stats, etc.)
│   │   ├── routers/
│   │   │   ├── reels.py           # Endpoints for querying, filtering, and stats
│   │   │   ├── ai.py              # Endpoints for Gemini Chat and Summarization
│   │   │   └── sync.py            # Endpoints for Playwright sync & OTP lifecycle
│   │   ├── scripts/
│   │   │   ├── enrich_reels.py    # Batch enrichment & clean title derivation
│   │   │   ├── index_all_embeddings.py # Vector embedding batch generation script
│   │   │   └── curate_all_with_gemini.py # Automated Gemini dataset curation
│   │   └── services/
│   │       ├── embeddings_manager.py # Vector cosine similarity & embedding caching
│   │       ├── extractor.py       # HTML archive parser for Instagram exports
│   │       ├── gemini_service.py  # Gemini API client, prompts, and classification
│   │       ├── instagram_sync.py  # Playwright browser automation & 2FA handling
│   │       ├── reels_service.py   # In-memory reels caching and query service
│   │       └── search_engine.py   # Multi-layered Hybrid Search & Concept Graph
│   ├── main.py                    # Uvicorn entrypoint
│   ├── pyproject.toml             # Python package dependencies (uv-compatible)
│   ├── .env.example               # Backend environment variables template
│   └── vercel.json                # Optional serverless deployment config
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── NotionHeader.tsx   # Top navigation, global search, and mode switch
│   │   │   ├── NotionCard.tsx     # Gallery view item card with status pills
│   │   │   ├── NotionTable.tsx    # Notion-style database table view
│   │   │   ├── NotionPageModal.tsx# Slide-over detail view with AI summary drawer
│   │   │   ├── NotionAIChat.tsx   # Grounded RAG conversational AI drawer
│   │   │   ├── SyncModal.tsx      # Playwright sync manager with live logs & OTP
│   │   │   ├── Sidebar.tsx        # Collapsible taxonomy tree & category counters
│   │   │   ├── TopicFilterBar.tsx # Quick topic selection bar
│   │   │   └── ContentSkeleton.tsx# Smooth loading skeleton states
│   │   ├── services/
│   │   │   └── api.ts             # Typed REST client with Vite environment support
│   │   ├── types/
│   │   │   └── index.ts           # Complete TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── textUtils.ts       # Caption cleaning, formatting, and unicode handling
│   │   │   └── titleUtils.ts      # Deterministic title formatting fallback
│   │   ├── App.tsx                # Master workspace layout and filter coordination
│   │   ├── index.css              # Tailwind CSS v4 design system
│   │   └── main.tsx               # Application root
│   ├── package.json               # Frontend dependencies (React 19, Vite, Tailwind v4)
│   ├── .env.example               # Frontend environment variables template
│   └── vite.config.ts             # Vite configuration
│
└── README.md                      # Project documentation
```

---

## 🚀 Quickstart & Installation

### Prerequisites
* **Python**: 3.12 or newer
* **Node.js**: 18.0 or newer
* **Package Managers**: `uv` (recommended) or `pip`, and `npm`
* **Google Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/)

---

### 1. Clone the Repository

```bash
git clone https://github.com/RADXIshan/Curio.git
cd Curio
```

---

### 2. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment** (using `uv` or `python`):
   ```bash
   # Using uv (fastest)
   uv venv
   source .venv/bin/activate

   # Or using standard python
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   # Using uv
   uv sync

   # Or using pip
   pip install -r <(python -c "import tomllib; f=open('pyproject.toml','rb'); print('\n'.join(tomllib.load(f)['project']['dependencies']))")
   ```

4. **Install Playwright browser binaries** (for Instagram Sync):
   ```bash
   playwright install chromium
   ```

5. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials:
   ```env
   PORT=8000
   GEMINI_API_KEY="your_gemini_api_key_here"
   INSTAGRAM_USERNAME="your_instagram_username"
   ACCOUNT_ID="your_instagram_username"
   ACCOUNT_PASSWORD="your_instagram_password"
   ```

6. **Start the backend server**:
   ```bash
   python main.py
   # Or using uv
   uv run main.py
   ```
   The backend API will start at **`http://127.0.0.1:8000`** with interactive Swagger documentation at **`http://127.0.0.1:8000/docs`**.

---

### 3. Frontend Setup

1. **Open a new terminal window and navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Ensure `.env` points to your local backend:
   ```env
   VITE_API_URL=http://127.0.0.1:8000
   ```

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   Open your browser to the local URL (typically **`http://localhost:5173`**).

---

## 🔬 Intelligent Hybrid Search Engine

Curio’s search engine uses a multi-stage scoring algorithm that balances semantic intent, domain associations, and keyword precision:

$$\text{Final Score} = \alpha \cdot S_{\text{semantic}} + \beta \cdot S_{\text{concept}} + \gamma \cdot S_{\text{lexical}} + \delta \cdot S_{\text{fuzzy}}$$

```
                     ┌──────────────────────────────┐
                     │          User Query          │
                     └──────────────┬───────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│ Semantic Vectors  │     │   Concept Graph   │     │ Multi-Field BM25  │
│ gemini-embedding  │     │  Synonym lookup   │     │ Weighted Lexical  │
│ Cosine Similarity │     │  & Domain mapping │     │  Title, Tags, Body│
└─────────┬─────────┘     └─────────┬─────────┘     └─────────┬─────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │ Typo Fuzzy Match & Stemming  │
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │ Ranked Reel Results + Badges │
                     └──────────────────────────────┘
```

1. **Semantic Vector Score ($S_{\text{semantic}}$)**:
   * Translates queries into high-dimensional vector representations via `gemini-embedding-001`.
   * Computes cosine similarity against the pre-indexed 5.5MB `reel_embeddings.npz` matrix.
2. **Domain Concept Graph ($S_{\text{concept}}$)**:
   * Maps concepts to known tech ecosystems (e.g. searching `"docker"` associates with `"containers"`, `"kubernetes"`, and `"DevOps & Cloud"`).
3. **Multi-Field Lexical Matching ($S_{\text{lexical}}$)**:
   * Weighted relevance: Title Match (4x) > Hashtags (3x) > Category (2.5x) > Author (2x) > Caption Text (1x).
4. **Fuzzy & Exact Match Boosters**:
   * Exact phrase matching provides an instantaneous multiplier.
   * Typo tolerance handles common misspellings (e.g., `"kubernets"`, `"postgresl"`).

---

## 🛠️ Offline CLI Utility Scripts

Curio comes with dedicated scripts for maintaining and enriching your dataset:

### 1. Vector Embeddings Indexing
To precompute vector embeddings for all saved reels into `backend/app/data/reel_embeddings.npz`:
```bash
cd backend
python -m app.scripts.index_all_embeddings
```

### 2. Dataset Enrichment & Title Cleaning
To run batch title cleanup, fix missing captions, and apply domain classification rules:
```bash
cd backend
python -m app.scripts.enrich_reels
```

### 3. Bulk Gemini Curation
To execute automated LLM curation across newly parsed items:
```bash
cd backend
python -m app.scripts.curate_all_with_gemini
```

---

## 🔄 Instagram Playwright Sync Workflow

Curio includes an automated browser pipeline to sync newly saved reels directly from your account:

1. **Session Check**: Checks `backend/app/data/instagram_session.json` for active session cookies.
2. **Headless Login**: If the session has expired, it initializes Chromium and logs into Instagram using credentials from `.env`.
3. **2FA / OTP Challenge**: If two-factor authentication is required:
   * The backend sets `awaiting_otp: true`.
   * The frontend **Sync Modal** displays a 2FA prompt.
   * Enter the SMS / Authenticator app OTP code and click **Submit**.
   * Playwright continues the session and saves the newly issued cookies to disk.
4. **Incremental Crawling**:
   * Opens `instagram.com/<username>/saved/all-posts/`.
   * Iterates through saved posts and compares post IDs against `reels.json`.
   * Stops scrolling once it reaches previously imported posts.
5. **Curation & Ingestion**:
   * New posts are classified and given cleaned titles.
   * Vector embeddings are generated for the newly added batch.
   * `reels.json` and `reel_embeddings.npz` are updated on disk.

---

## 📡 API Reference

### Reels Endpoints (`/api/reels`)

#### `GET /api/reels`
Retrieve saved reels with support for filtering, hybrid search, sorting, and pagination.

* **Query Parameters**:
  * `search` *(string, optional)*: Natural language search query.
  * `type` *(string, optional)*: Filter by item type: `"reel"` or `"post"`.
  * `category` *(string, optional)*: Filter by category (e.g., `"AI & Agents"`, `"System Design & Backend"`).
  * `tag` *(string, optional)*: Filter by hashtag.
  * `sort` *(string, optional)*: Sort order (`"relevance"`, `"newest"`, `"oldest"`, `"title"`, `"author"`).
  * `limit` *(int, default: 50)*: Number of items to return.
  * `offset` *(int, default: 0)*: Pagination offset.

#### `GET /api/reels/search/suggestions`
Get real-time search suggestions, concepts, and related domain topics.
* **Query Parameters**:
  * `q` *(string)*: Query prefix string.
  * `limit` *(int, default: 6)*: Maximum suggestions to return.

#### `GET /api/reels/stats`
Returns aggregated dataset statistics, breakdown of reels vs. posts, category counts, and top tags.

#### `GET /api/reels/{reel_id}`
Returns full metadata for a specific reel by shortcode ID.

---

### AI Endpoints (`/api/ai`)

#### `POST /api/ai/chat`
Conversational RAG assistant grounded in the user's saved collection.
* **Request Body**:
  ```json
  {
    "message": "What AI agent repos and frameworks did I save?",
    "history": [
      { "role": "user", "content": "Hi" },
      { "role": "model", "content": "Hello! How can I help you explore your saved posts?" }
    ]
  }
  ```
* **Response**:
  ```json
  {
    "reply": "You have saved several repositories focusing on AI agents...",
    "referenced_reels": [
      {
        "id": "DdQS2d8KMPh",
        "title": "Building Autonomous AI Agents with Tool Calling",
        "url": "https://www.instagram.com/reel/DdQS2d8KMPh/",
        "category": "AI & Agents"
      }
    ]
  }
  ```

#### `POST /api/ai/summarize/{reel_id}`
Generates a structured Gemini summary with key takeaways and actionable tips for a specific reel.

#### `GET /api/ai/status`
Checks if the Gemini API key is configured and returns the active model name.

---

### Sync Endpoints (`/api/sync`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/sync/start` | Starts the background Playwright synchronization job |
| `GET` | `/api/sync/status` | Polls current progress, stage, terminal logs, and 2FA status |
| `POST` | `/api/sync/otp` | Submits the 2FA / OTP verification code to the active browser |
| `POST` | `/api/sync/cancel` | Terminates the active browser sync session |

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `PORT` | No | Port for the FastAPI server | `8000` |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API Key | `AIzaSy...` |
| `INSTAGRAM_USERNAME` | For Sync | Instagram account username | `ishan_roy31` |
| `ACCOUNT_ID` | For Sync | Fallback Instagram account username | `ishan_roy31` |
| `ACCOUNT_PASSWORD` | For Sync | Instagram account password | `••••••••••••` |

### Frontend (`frontend/.env`)

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | **Yes** | Base URL pointing to the FastAPI backend | `http://127.0.0.1:8000` |

---

## 🛡️ Privacy & Security

* **Local-First Data**: All saved posts, captions, and vector embeddings are stored locally within your workspace (`backend/app/data/`).
* **Zero Credential Sharing**: Instagram credentials are used exclusively by your local Playwright browser instance and are never transmitted to external services.
* **Grounded AI Queries**: Only the text content of your saved captions and metadata is sent to Google Gemini when you request an AI summary or chat query.

---

## 🗺️ Roadmap

- [x] Notion-inspired Gallery and Table view
- [x] Google Gemini 3.5 Flash Lite RAG conversational chatbot
- [x] Vector embedding hybrid search engine (`gemini-embedding-001`)
- [x] Automated Playwright sync with interactive web OTP / 2FA
- [x] Auto-categorization across 11+ engineering domains
- [ ] Export knowledge base to Notion, Obsidian, and Markdown
- [ ] Automated video transcript extraction via Whisper / Audio analysis
- [ ] Multi-account synchronization support

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<div align="center">
  <sub>Built with ❤️ for lifelong learners who save too many reels.</sub>
</div>
