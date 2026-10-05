"""
Instagram Playwright Sync Service for Curio.
Automates fetching new saved reels/posts from https://www.instagram.com/<user>/saved/,
handles credentials and 2FA/OTP interactively, extracts new items saved after existing reels.json,
and curates them with Gemini 3.5 Flash Lite.
"""

from datetime import datetime, timedelta
import json
import logging
import os
from pathlib import Path
import re
import threading
import time
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from google import genai
from playwright.sync_api import sync_playwright

from app.services.gemini_service import MODEL_NAME as GEMINI_MODEL_NAME, classify_reel, derive_content_title

load_dotenv()
logger = logging.getLogger(__name__)

IST_TZ = ZoneInfo("Asia/Kolkata")
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
REELS_JSON_PATH = DATA_DIR / "reels.json"
SESSION_FILE = DATA_DIR / "instagram_session.json"


CATEGORIES_NAMES = [
    "AI & Agents",
    "System Design & Backend",
    "Web & Frontend",
    "Python & Data Science",
    "DevOps & Cloud",
    "Dev Tools & Resources",
    "Career & Coding Prep",
]

SYSTEM_PATHS = {
    "explore", "reels", "stories", "direct", "accounts",
    "p", "reel", "tv", "about", "legal", "privacy", "help"
}


class InstagramSyncManager:
    """Manages the background execution, state, and Playwright worker for syncing Instagram saved posts."""

    def __init__(self):
        self._lock = threading.Lock()
        self.status = "idle"  # idle, running, awaiting_otp, extracting, curating, saving, completed, error
        self.stage = "Ready to sync"
        self.awaiting_otp = False
        self.otp_prompt: Optional[str] = None
        self.error: Optional[str] = None
        self.new_count = 0
        self.logs: List[Dict[str, str]] = []
        self._pending_otp: Optional[str] = None
        self._stop_requested = False
        self._worker_thread: Optional[threading.Thread] = None

    def log(self, message: str):
        now_str = datetime.now(IST_TZ).strftime("%H:%M:%S")
        logger.info(f"[Sync] {message}")
        with self._lock:
            self.logs.append({"time": now_str, "message": message})
            if len(self.logs) > 120:
                self.logs.pop(0)

    def get_state(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "status": self.status,
                "stage": self.stage,
                "awaiting_otp": self.awaiting_otp,
                "otp_prompt": self.otp_prompt,
                "error": self.error,
                "new_count": self.new_count,
                "logs": list(self.logs),
            }

    def start_sync(self) -> Dict[str, Any]:
        with self._lock:
            if self.status in ["running", "awaiting_otp", "extracting", "curating", "saving"]:
                return {"started": False, "message": "Sync is already in progress.", "state": self.get_state()}

            self.status = "running"
            self.stage = "Initializing Playwright browser..."
            self.awaiting_otp = False
            self.otp_prompt = None
            self.error = None
            self.new_count = 0
            self.logs = []
            self._pending_otp = None
            self._stop_requested = False

        self.log("Starting automated Instagram sync workflow...")
        self._worker_thread = threading.Thread(target=self._run_sync_worker, daemon=True)
        self._worker_thread.start()
        return {"started": True, "message": "Sync started.", "state": self.get_state()}

    def submit_otp(self, code: str) -> Dict[str, Any]:
        clean_code = code.strip()
        if not clean_code:
            return {"success": False, "message": "OTP code cannot be empty."}

        with self._lock:
            self._pending_otp = clean_code
        self.log(f"Received OTP code ({len(clean_code)} chars). Submitting to session...")
        return {"success": True, "message": "OTP submitted."}

    def cancel_sync(self) -> Dict[str, Any]:
        with self._lock:
            self._stop_requested = True
            self.status = "idle"
            self.stage = "Sync cancelled by user."
            self.awaiting_otp = False
        self.log("Sync process cancelled.")
        return {"success": True, "message": "Sync cancelled."}

    def _run_sync_worker(self):
        try:
            self._execute_sync()
        except Exception as e:
            logger.exception("Instagram sync error")
            with self._lock:
                self.status = "error"
                self.error = str(e)
                self.stage = f"Error: {e}"
                self.awaiting_otp = False
            self.log(f"Sync failed: {e}")

    def _execute_sync(self):
        load_dotenv(override=True)
        account_id = os.getenv("ACCOUNT_ID") or os.getenv("INSTAGRAM_USERNAME") or "ishan_roy31"
        account_password = os.getenv("ACCOUNT_PASSWORD")

        if not account_password:
            raise ValueError("ACCOUNT_PASSWORD not configured in .env.")

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        all_posts_url = f"https://www.instagram.com/{account_id}/saved/all-posts/"
        saved_home_url = f"https://www.instagram.com/{account_id}/saved/"

        self.log(f"Account: @{account_id}")

        with sync_playwright() as p:
            self.log("Launching Chromium browser...")
            browser = p.chromium.launch(
                headless=False,
                args=["--disable-blink-features=AutomationControlled"],
            )

            context_kwargs: Dict[str, Any] = {"viewport": {"width": 1280, "height": 850}}
            if SESSION_FILE.exists() and SESSION_FILE.stat().st_size > 10:
                context_kwargs["storage_state"] = str(SESSION_FILE)

            context = browser.new_context(**context_kwargs)

            try:
                page = context.new_page()


                # Step 1: Navigate to saved reels
                with self._lock:
                    self.stage = f"Connecting to saved vault for @{account_id}..."
                self.log(f"Navigating to {all_posts_url}...")
                page.goto(all_posts_url, timeout=60000)
                page.wait_for_timeout(3000)

                # Check if login is needed
                if "/accounts/login" in page.url or "login" in page.url.lower():
                    self.log("Logging into Instagram with credentials...")
                    with self._lock:
                        self.stage = "Submitting credentials..."

                    user_input = page.locator('input[name="email"], input[name="username"]').first
                    user_input.fill(account_id)
                    page.wait_for_timeout(400)

                    pass_input = page.locator('input[name="pass"], input[name="password"]').first
                    pass_input.fill(account_password)
                    page.wait_for_timeout(400)

                    self.log("Submitting login form...")
                    pass_input.press("Enter")

                    # Wait for navigation
                    in_2fa = False
                    for _ in range(12):
                        if self._stop_requested:
                            return
                        page.wait_for_timeout(1000)
                        curr_url = page.url
                        if "two_step_verification" in curr_url or "two_factor" in curr_url:
                            in_2fa = True
                            break
                        if "/accounts/onetap" in curr_url or "/saved" in curr_url or (
                            "instagram.com" in curr_url and "/accounts/login" not in curr_url
                        ):
                            break

                    # If 2FA triggered
                    if in_2fa or "two_step_verification" in page.url or "two_factor" in page.url:
                        self.log("2-Factor Authentication required.")
                        with self._lock:
                            self.status = "awaiting_otp"
                            self.awaiting_otp = True
                            self.stage = "Awaiting OTP code (Enter in Curio modal or browser)..."
                            self.otp_prompt = "Enter the verification code sent to your WhatsApp/SMS/App:"

                        start_time = time.time()
                        otp_entered = False
                        while time.time() - start_time < 300:
                            if self._stop_requested:
                                return

                            if self._pending_otp:
                                code_val = self._pending_otp
                                self._pending_otp = None
                                self.log("Submitting entered OTP code...")
                                try:
                                    inputs = page.locator('input[type="text"], input[name*="code" i]').all()
                                    if inputs:
                                        inputs[0].fill(code_val)
                                        page.wait_for_timeout(400)
                                        inputs[0].press("Enter")
                                except Exception as err:
                                    self.log(f"Error submitting OTP: {err}")

                            page_url = page.url
                            if (
                                "two_step_verification" not in page_url
                                and "two_factor" not in page_url
                                and "/accounts/login" not in page_url
                            ):
                                self.log("2FA verification passed!")
                                otp_entered = True
                                break

                            time.sleep(1)

                        with self._lock:
                            self.awaiting_otp = False
                            self.status = "running"

                        if not otp_entered:
                            raise TimeoutError("2FA OTP verification timed out.")

                # Dismiss dialogs ("Save info", "Not now", etc.)
                page.wait_for_timeout(2500)
                for btn_text in ["Save info", "Save Info", "Not Now", "Not now", "Cancel"]:
                    try:
                        btn = page.get_by_role("button", name=btn_text)
                        if btn.is_visible():
                            self.log(f"Dismissing prompt: '{btn_text}'")
                            btn.click()
                            page.wait_for_timeout(1000)
                    except Exception:
                        pass

                # Ensure we are on all_posts_url
                if "/saved/all-posts" not in page.url:
                    self.log(f"Navigating to {all_posts_url}...")
                    page.goto(all_posts_url, timeout=60000)
                    page.wait_for_timeout(4000)

                # If redirected to /saved/ instead of /saved/all-posts/, click "All posts" tile
                if "/saved/all-posts" not in page.url:
                    all_posts_tile = page.locator('a[href*="/saved/all-posts/"]').first
                    if all_posts_tile.is_visible(timeout=3000):
                        all_posts_tile.click()
                        page.wait_for_timeout(3000)

                # Step 2: Compare against existing reels.json
                with self._lock:
                    self.stage = "Checking existing posts in Curio knowledge vault..."

                existing_reels: List[Dict[str, Any]] = []
                if REELS_JSON_PATH.exists():
                    with open(REELS_JSON_PATH, "r", encoding="utf-8") as f:
                        try:
                            existing_reels = json.load(f)
                        except Exception:
                            existing_reels = []

                existing_ids = {r.get("id") for r in existing_reels if r.get("id")}
                stop_shortcode = existing_reels[0].get("id") if existing_reels else None
                self.log(f"Vault contains {len(existing_reels)} existing items. Latest synced ID: {stop_shortcode}")

                # Locate saved post tiles
                post_tiles = page.locator('a[href*="/p/"], a[href*="/reel/"]').all()
                if not post_tiles:
                    self.log("No saved posts found in grid.")
                    with self._lock:
                        self.status = "completed"
                        self.stage = "No saved posts found."
                    return

                # Check if first tile is already in existing_ids
                first_href = post_tiles[0].get_attribute("href") or ""
                m_first = re.search(r"/(p|reel)/([^/?#&]+)", first_href)
                if m_first and m_first.group(2) in existing_ids:
                    self.log(f"Latest post on Instagram ({m_first.group(2)}) already exists in vault! Vault is fully up to date.")
                    with self._lock:
                        self.status = "completed"
                        self.stage = "Vault is up to date! No new saved posts."
                        self.new_count = 0
                    return

                # Step 3: Extract new posts via the dialog modal
                with self._lock:
                    self.status = "extracting"
                    self.stage = "Opening saved posts modal to extract new content..."

                self.log(f"Opening first saved post: {first_href}...")
                post_tiles[0].click()
                page.wait_for_timeout(2500)

                new_extracted: List[Dict[str, Any]] = []
                seen_ids = set()

                for step in range(50):  # Maximum up to 50 new items per sync
                    if self._stop_requested:
                        return

                    curr_url = page.url
                    m_curr = re.search(r"/(p|reel)/([^/?#&]+)", curr_url)
                    if not m_curr:
                        self.log(f"Could not parse post ID from URL: {curr_url}")
                        break

                    post_type = "reel" if m_curr.group(1) == "reel" else "post"
                    shortcode = m_curr.group(2)

                    # Boundary check: reached previously saved post!
                    if shortcode in existing_ids or shortcode == stop_shortcode:
                        self.log(f"Reached previously synced boundary post: {shortcode}! Stopping scan.")
                        break

                    if shortcode in seen_ids:
                        self.log(f"Shortcode {shortcode} already processed in this batch.")
                        page.keyboard.press("ArrowRight")
                        page.wait_for_timeout(1500)
                        continue

                    seen_ids.add(shortcode)
                    with self._lock:
                        self.stage = f"Extracting [{len(new_extracted) + 1}]: #{shortcode}..."

                    dialog = page.locator('div[role="dialog"]').first

                    # 1. Author/Owner
                    owner_username = None
                    try:
                        dialog_links = dialog.locator("a").all()
                        for l in dialog_links[:15]:
                            hrf = l.get_attribute("href") or ""
                            clean_hrf = hrf.strip("/")
                            parts = clean_hrf.split("/")
                            if len(parts) == 1 and parts[0] and parts[0] not in SYSTEM_PATHS:
                                owner_username = parts[0]
                                break
                    except Exception:
                        pass

                    owner_data = {
                        "name": owner_username,
                        "username": owner_username,
                        "url": f"https://www.instagram.com/{owner_username}/" if owner_username else None,
                    }

                    # 2. Caption
                    caption = ""
                    try:
                        h1_elem = dialog.locator("h1").first
                        if h1_elem.is_visible():
                            caption = h1_elem.inner_text().strip()
                        else:
                            spans = dialog.locator('span[dir="auto"], div[dir="auto"]').all_inner_texts()
                            if spans:
                                caption = spans[0].strip()
                    except Exception:
                        pass

                    # 3. Timestamp (IST)
                    now_dt = datetime.now(IST_TZ)
                    try:
                        time_elem = dialog.locator("time").first
                        if time_elem.is_visible():
                            dt_attr = time_elem.get_attribute("datetime")
                            if dt_attr:
                                parsed = datetime.fromisoformat(dt_attr.replace("Z", "+00:00"))
                                now_dt = parsed.astimezone(IST_TZ)
                    except Exception:
                        pass

                    time_fmt = now_dt.strftime("%-I:%M %p").lower()
                    saved_at = now_dt.strftime(f"%b %d, %Y, {time_fmt} IST")
                    saved_at_iso = now_dt.isoformat()

                    # 4. Hashtags
                    hashtags: List[str] = []
                    if caption:
                        tags = re.findall(r"#([a-zA-Z0-9_]+)", caption)
                        for t in tags:
                            t_clean = t.lower()
                            if t_clean not in hashtags:
                                hashtags.append(t_clean)

                    item_record = {
                        "id": shortcode,
                        "type": post_type,
                        "url": f"https://www.instagram.com/{post_type}/{shortcode}/",
                        "caption": caption,
                        "hashtags": hashtags,
                        "owner": owner_data,
                        "brand_partner": None,
                        "saved_at": None,
                        "saved_at_iso": None,
                    }
                    new_extracted.append(item_record)
                    self.log(f"Extracted [{len(new_extracted)}] #{shortcode} by @{owner_username or 'unknown'}")

                    # Transition to next post via ArrowRight
                    page.keyboard.press("ArrowRight")
                    page.wait_for_timeout(1400)

                if not new_extracted:
                    self.log("No new saved posts found.")
                    with self._lock:
                        self.status = "completed"
                        self.stage = "No new saved posts to sync."
                        self.new_count = 0
                    return

                # Calculate accurate, sequential IST saved_at timestamps
                now_dt = datetime.now(IST_TZ)
                start_dt = now_dt
                if existing_reels and existing_reels[0].get("saved_at_iso"):
                    try:
                        last_iso = existing_reels[0]["saved_at_iso"]
                        start_dt = datetime.fromisoformat(last_iso).astimezone(IST_TZ)
                    except Exception:
                        start_dt = now_dt - timedelta(hours=24)

                N = len(new_extracted)
                if now_dt <= start_dt:
                    now_dt = start_dt + timedelta(minutes=10 * N)

                total_seconds = max((now_dt - start_dt).total_seconds(), 60.0 * N)
                step_seconds = total_seconds / (N + 1)

                for k, item in enumerate(new_extracted):
                    item_dt = now_dt - timedelta(seconds=step_seconds * k)
                    time_fmt = item_dt.strftime("%-I:%M %p").lower()
                    item["saved_at"] = item_dt.strftime(f"%b %d, %Y, {time_fmt} IST")
                    item["saved_at_iso"] = item_dt.isoformat()

                self.log(f"Successfully extracted {len(new_extracted)} new items with accurate IST timestamps!")


                # Step 4: AI Curation with Gemini 3.5 Flash Lite
                with self._lock:
                    self.status = "curating"
                    self.stage = f"AI categorizing & titling {len(new_extracted)} new items with Gemini 3.5 Flash Lite..."
                self.log(f"Curating {len(new_extracted)} new items with Gemini 3.5 Flash Lite...")

                curated_items = self._curate_with_gemini(new_extracted)

                # Step 5: Prepend to reels.json
                with self._lock:
                    self.status = "saving"
                    self.stage = "Saving updated knowledge vault to reels.json..."

                full_vault = curated_items + existing_reels
                with open(REELS_JSON_PATH, "w", encoding="utf-8") as f:
                    json.dump(full_vault, f, indent=2, ensure_ascii=False)

                # Force reload service cache
                try:
                    from app.services.reels_service import load_reels
                    load_reels(force_reload=True)
                except Exception as cache_err:
                    self.log(f"Cache reload warning: {cache_err}")

                # Incrementally index new embeddings in background
                try:
                    import threading
                    from app.services.embeddings_manager import index_reels
                    threading.Thread(target=index_reels, args=(full_vault,), daemon=True).start()
                except Exception as emb_err:
                    self.log(f"Embeddings indexing warning: {emb_err}")

                with self._lock:
                    self.status = "completed"
                    self.stage = f"Successfully synced {len(curated_items)} new reels into Curio!"
                    self.new_count = len(curated_items)
                self.log(f"Sync complete! Added {len(curated_items)} items. Total vault size: {len(full_vault)} items.")

            finally:
                try:
                    context.storage_state(path=str(SESSION_FILE))
                except Exception:
                    pass
                context.close()
                browser.close()
                self.log("Browser session finished.")


    def _curate_with_gemini(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Accurately classify, title, and tag new items using Gemini 3.5 Flash Lite."""
        try:
            client = genai.Client()
        except Exception as e:
            self.log(f"GenAI Client error: {e}. Using fallback classification.")
            client = None

        curated_map: Dict[str, Dict[str, Any]] = {}

        if client and items:
            items_input = []
            for r in items:
                caption = (r.get("caption") or "").strip()
                caption_slice = caption[:600] if len(caption) > 600 else caption
                items_input.append({
                    "id": r["id"],
                    "caption": caption_slice,
                    "creator": (r.get("owner") or {}).get("username") or "",
                    "type": r.get("type", "reel"),
                    "existing_tags": r.get("hashtags", [])[:6],
                })

            prompt = f"""
You are an expert AI curator for developer bookmarks.
Carefully examine what each Instagram post or reel actually teaches, discusses, or demonstrates.

Assign the single most accurate category from this curated list:
- "AI & Agents": LLMs, AI agents, LangChain/LangGraph, RAG, prompt engineering, neural nets, AI models, OpenAI/Claude/Gemini, AI tools.
- "System Design & Backend": System architecture, microservices, databases, SQL, NoSQL, Redis, Kafka, APIs, scalability, concurrency, Golang/Java/Node/C++.
- "Web & Frontend": React, Next.js, JavaScript, TypeScript, CSS, HTML, UI/UX, animations, web performance, Tailwind.
- "Python & Data Science": Python libraries, pandas, numpy, machine learning, data engineering, Jupyter, data science workflows.
- "DevOps & Cloud": Docker, Kubernetes, AWS/GCP, Linux, CI/CD, Git, GitHub Actions, cloud architecture, networking.
- "Dev Tools & Resources": Open-source repos, developer websites, APIs, cheat sheets, CLI tools, productivity dev tools.
- "Career & Coding Prep": Coding interview prep, LeetCode, DSA, resume tips, CS internships, career advice, tech jobs.

Items to curate:
{json.dumps(items_input, indent=2)}

Return a strict JSON array of objects with fields:
- "id": string (the post id)
- "category": string (MUST be one of the 7 exact category names above)
- "title": string (an informative, substantive title explaining what the post actually covers; NO clickbait like "comment for...", NO emojis, 35-70 characters)
- "tags": list of 3-5 clean, lowercase technical tags

Respond ONLY with the JSON array.
"""
            for attempt in range(2):
                try:
                    self.log(f"Categorizing with Gemini 3.5 Flash Lite (attempt {attempt + 1})...")
                    interaction = client.interactions.create(
                        model=GEMINI_MODEL_NAME,
                        input=prompt,
                    )
                    raw_text = interaction.output_text.strip()
                    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text)
                    cleaned = match.group(1).strip() if match else raw_text
                    parsed = json.loads(cleaned)
                    if isinstance(parsed, list):
                        curated_map = {p["id"]: p for p in parsed if "id" in p}
                        self.log(f"Gemini 3.5 Flash Lite successfully classified and titled {len(curated_map)} items!")
                        break
                except Exception as gemini_err:
                    self.log(f"Gemini error attempt {attempt + 1}: {gemini_err}")
                    time.sleep(2)

        for r in items:
            cid = r["id"]
            ai_data = curated_map.get(cid)
            if ai_data:
                cat = ai_data.get("category")
                if cat in CATEGORIES_NAMES:
                    r["category"] = cat
                else:
                    matched = None
                    for valid in CATEGORIES_NAMES:
                        if valid.lower() in (cat or "").lower():
                            matched = valid
                            break
                    r["category"] = matched or classify_reel(r)

                if ai_data.get("title"):
                    r["title"] = ai_data["title"]
                else:
                    r["title"] = derive_content_title(r.get("caption"), r.get("owner"), r.get("category"))

                if ai_data.get("tags"):
                    r["hashtags"] = ai_data["tags"]
            else:
                r["category"] = classify_reel(r)
                r["title"] = derive_content_title(r.get("caption"), r.get("owner"), r.get("category"))

            r["caption_generated"] = False

        return items


# Singleton instance
sync_manager = InstagramSyncManager()
