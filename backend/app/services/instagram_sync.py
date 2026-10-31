"""
Instagram Playwright Sync Service for Curio.
Automates fetching new saved reels/posts from https://www.instagram.com/<user>/saved/,
handles credentials (both returning-account 'Continue' flows and first-time username+password flows)
and 2FA/OTP (automatically switching from WhatsApp to SMS via 'Try another way' if needed,
opening macOS Messages, reading ~/Library/Messages/chat.db, and submitting the OTP),
extracts new items saved after existing reels.json, and curates them with Gemini 3.5 Flash Lite.
"""

from datetime import datetime, timedelta
import json
import logging
import os
from pathlib import Path
import re
import threading
import time
from typing import Any, Dict, List, Optional, Set
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from google import genai
from playwright.sync_api import Page, sync_playwright

from app.services.gemini_service import MODEL_NAME as GEMINI_MODEL_NAME, classify_reel, derive_content_title
from app.services.messages_otp import (
    check_messages_db_access,
    get_baseline_message_rowid,
    get_baseline_whatsapp_pk,
    get_clipboard_content,
    open_messages_app,
    poll_clipboard_for_otp,
    query_recent_messages_for_otp,
    query_recent_whatsapp_for_otp,
)

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
        self.auto_otp_status: Optional[str] = None
        self.messages_access: bool = check_messages_db_access().get("accessible", False)
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
            if len(self.logs) > 150:
                self.logs.pop(0)

    def get_state(self) -> Dict[str, Any]:
        db_access = check_messages_db_access().get("accessible", False)
        with self._lock:
            self.messages_access = db_access
            return {
                "status": self.status,
                "stage": self.stage,
                "awaiting_otp": self.awaiting_otp,
                "otp_prompt": self.otp_prompt,
                "auto_otp_status": self.auto_otp_status,
                "messages_access": self.messages_access,
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
            self.auto_otp_status = None
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
        clean_code = re.sub(r"[\s\-]", "", code.strip())
        if not clean_code:
            return {"success": False, "message": "OTP code cannot be empty."}

        with self._lock:
            self._pending_otp = clean_code
        self.log(f"Received manual OTP code ({len(clean_code)} digits). Submitting to Instagram...")
        return {"success": True, "message": "OTP submitted."}

    def cancel_sync(self) -> Dict[str, Any]:
        with self._lock:
            self._stop_requested = True
            self.status = "idle"
            self.stage = "Sync cancelled by user."
            self.awaiting_otp = False
            self.auto_otp_status = None
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
                self.auto_otp_status = None
            self.log(f"Sync failed: {e}")

    def _is_on_2fa_page(self, page: Page) -> bool:
        """Detect whether the Playwright page is currently on an Instagram 2FA/OTP verification step."""
        curr_url = page.url.lower()
        if any(tok in curr_url for tok in ("two_step_verification", "two_factor", "/challenge/")):
            return True

        try:
            otp_locator = page.locator(
                'input[name="verificationCode"], '
                'input[autocomplete="one-time-code"], '
                'input[aria-label*="Security Code" i], '
                'input[aria-label*="verification code" i], '
                'input[placeholder*="security code" i], '
                'input[placeholder*="confirmation code" i]'
            )
            if otp_locator.count() > 0 and otp_locator.first.is_visible():
                return True
        except Exception:
            pass
        return False

    def _is_logged_in_past_auth(self, page: Page) -> bool:
        """Check whether the browser has navigated past login and 2FA screens."""
        curr_url = page.url.lower()
        if any(
            tok in curr_url
            for tok in ("/accounts/login", "two_step_verification", "two_factor", "/challenge/")
        ):
            return False
        return "instagram.com" in curr_url

    def _perform_login_flow(self, page: Page, account_id: str, account_password: str):
        """
        Handle both Returning Account login (clicking 'Continue' / 'Continue <user>', then entering password)
        and First-Time Account login (entering username + password, or username -> Continue -> password).
        """
        user_selector = 'input[name="email"], input[name="username"], input[aria-label*="username" i], input[aria-label*="phone number" i]'
        pass_selector = 'input[name="pass"], input[name="password"], input[type="password"]'

        user_loc = page.locator(user_selector)
        pass_loc = page.locator(pass_selector)

        has_user_input = False
        has_pass_input = False
        try:
            has_user_input = user_loc.count() > 0 and user_loc.first.is_visible()
            has_pass_input = pass_loc.count() > 0 and pass_loc.first.is_visible()
        except Exception:
            pass

        # Case 1: Returning Account screen (no username or password field visible yet; 'Continue' button shown)
        if not has_user_input and not has_pass_input:
            self.log(f"Returning account screen detected for @{account_id}. Clicking 'Continue'...")
            with self._lock:
                self.stage = f"Returning account @{account_id} — clicking Continue..."

            clicked_continue = False
            continue_selectors = [
                f'div[role="button"][aria-label*="Continue {account_id}" i]',
                'div[role="button"][aria-label*="Continue" i]',
                'button:has-text("Continue")',
                'div[role="button"]:has-text("Continue")',
            ]
            for sel in continue_selectors:
                try:
                    btn = page.locator(sel)
                    if btn.count() > 0 and btn.first.is_visible():
                        btn.first.click()
                        clicked_continue = True
                        break
                except Exception:
                    continue

            if clicked_continue:
                page.wait_for_timeout(2500)
            else:
                self.log("No 'Continue' button found; checking for login inputs...")

            if self._is_logged_in_past_auth(page) or self._is_on_2fa_page(page):
                self.log("Proceeded past returning-account Continue screen.")
                return

        # Re-check visible inputs after potential 'Continue' click
        try:
            has_user_input = user_loc.count() > 0 and user_loc.first.is_visible()
            has_pass_input = pass_loc.count() > 0 and pass_loc.first.is_visible()
        except Exception:
            pass

        # Case 2: First-Time Login (or if username input is visible alongside or before password)
        if has_user_input:
            self.log(f"Username field visible — entering @{account_id}...")
            with self._lock:
                self.stage = f"Entering username @{account_id}..."
            user_input = user_loc.first
            user_input.click()
            user_input.fill(account_id)
            page.wait_for_timeout(400)

            try:
                has_pass_input = pass_loc.count() > 0 and pass_loc.first.is_visible()
            except Exception:
                has_pass_input = False

            if not has_pass_input:
                self.log("Clicking Continue to advance to password step...")
                try:
                    cont_btn = page.locator('button:has-text("Continue"), div[role="button"]:has-text("Continue")').first
                    if cont_btn.is_visible():
                        cont_btn.click()
                    else:
                        user_input.press("Enter")
                except Exception:
                    user_input.press("Enter")
                page.wait_for_timeout(2000)

        # Case 3: Password field (either from Returning Account modal after clicking Continue, or standard login form)
        try:
            page.wait_for_selector(pass_selector, state="visible", timeout=6000)
            has_pass_input = True
        except Exception:
            has_pass_input = pass_loc.count() > 0 and pass_loc.first.is_visible()

        if has_pass_input:
            self.log("Entering account password...")
            with self._lock:
                self.stage = "Entering password and logging in..."

            pass_input = pass_loc.first
            pass_input.click()
            page.wait_for_timeout(150)
            pass_input.fill(account_password)
            page.wait_for_timeout(400)

            self.log("Submitting login credentials...")
            pass_input.press("Enter")
            page.wait_for_timeout(800)

            for login_sel in [
                'div[role="dialog"] div[role="button"]:has-text("Log in")',
                'button[type="submit"]',
                'button:has-text("Log in")',
                'div[role="button"]:has-text("Log in")',
            ]:
                try:
                    lbtn = page.locator(login_sel)
                    if lbtn.count() > 0 and lbtn.first.is_visible():
                        lbtn.first.click()
                        break
                except Exception:
                    continue

    def _switch_2fa_to_sms_if_needed(self, page: Page):
        """
        Inspect the Instagram 2FA screen:
        - If it already sent the OTP to SMS / Messages in the first screen, do nothing and proceed to Messages.
        - If it says the OTP was sent to WhatsApp (or Authenticator App), automatically click
          'Try another way' -> select 'Text message' (SMS) -> click 'Continue' so the OTP arrives in macOS Messages.
        """
        page.wait_for_timeout(1500)

        # Also handle any initial 'Send Security Code' screen if no input is shown yet
        try:
            for btn_label in ["Send Security Code", "Send security code", "Send code", "Get code"]:
                btn = page.get_by_role("button", name=btn_label)
                if btn.count() > 0 and btn.first.is_visible():
                    self.log(f"Clicking '{btn_label}' on Instagram challenge screen...")
                    btn.first.click()
                    page.wait_for_timeout(1800)
                    break
        except Exception:
            pass

        body_text = ""
        try:
            body_text = (page.locator("body").inner_text() or "").lower()
        except Exception:
            pass

        is_whatsapp_or_app = "whatsapp" in body_text or "authentication app" in body_text or "authenticator" in body_text
        if not is_whatsapp_or_app:
            self.log("Instagram 2FA is already set to SMS / Messages! Proceeding directly to macOS Messages...")
            return

        self.log("Instagram sent OTP to WhatsApp initially. Clicking 'Try another way' to switch to SMS (Messages)...")
        with self._lock:
            self.stage = "Switching 2FA from WhatsApp to SMS ('Try another way')..."

        clicked_try_another = False
        try_another_selectors = [
            'button:has-text("Try another way")',
            'div[role="button"]:has-text("Try another way")',
            'span:has-text("Try another way")',
            'a:has-text("Try another way")',
            'button:has-text("Use another method")',
            'div[role="button"]:has-text("Use another method")',
        ]
        for sel in try_another_selectors:
            try:
                loc = page.locator(sel)
                if loc.count() > 0 and loc.first.is_visible():
                    loc.first.click()
                    clicked_try_another = True
                    break
            except Exception:
                continue

        if not clicked_try_another:
            try:
                fallback_btn = page.get_by_text(re.compile(r"try another way|another way|change method", re.I)).first
                if fallback_btn.is_visible():
                    fallback_btn.click()
                    clicked_try_another = True
            except Exception:
                pass

        if not clicked_try_another:
            self.log("Could not find 'Try another way' button on 2FA page; continuing to watch for OTP...")
            return

        self.log("Opened 'Try another way' options. Selecting 'Text message' (SMS)...")
        page.wait_for_timeout(1800)

        # Select the 'Text message' / 'SMS' option in the dialog/list
        selected_sms = False
        sms_selectors = [
            'div[role="dialog"] label:has-text("Text message")',
            'div[role="dialog"] div[role="button"]:has-text("Text message")',
            'div[role="dialog"] div[role="radio"]:has-text("Text message")',
            'div[role="dialog"] span:has-text("Text message")',
            'label:has-text("Text message")',
            'div[role="button"]:has-text("Text message")',
            'div[role="radio"]:has-text("Text message")',
            'span:has-text("Text message")',
            'label:has-text("SMS")',
            'span:has-text("SMS")',
        ]
        for sel in sms_selectors:
            try:
                loc = page.locator(sel)
                if loc.count() > 0 and loc.first.is_visible():
                    loc.first.click()
                    selected_sms = True
                    self.log("Selected 'Text message' (SMS) option.")
                    break
            except Exception:
                continue

        if not selected_sms:
            try:
                sms_text = page.get_by_text(re.compile(r"Text message|SMS", re.I)).first
                if sms_text.is_visible():
                    sms_text.click()
                    selected_sms = True
                    self.log("Selected 'Text message' (SMS) option via text match.")
            except Exception:
                pass

        page.wait_for_timeout(700)

        # Click 'Continue' / 'Send' / 'Confirm' in the modal to dispatch the SMS code
        clicked_confirm_method = False
        confirm_selectors = [
            'div[role="dialog"] button:has-text("Continue")',
            'div[role="dialog"] div[role="button"]:has-text("Continue")',
            'div[role="dialog"] button:has-text("Send")',
            'div[role="dialog"] div[role="button"]:has-text("Send")',
            'div[role="dialog"] button:has-text("Confirm")',
            'button:has-text("Continue")',
            'div[role="button"]:has-text("Continue")',
            'button:has-text("Send code")',
            'div[role="button"]:has-text("Send code")',
        ]
        for sel in confirm_selectors:
            try:
                loc = page.locator(sel)
                if loc.count() > 0 and loc.first.is_visible():
                    loc.first.click()
                    clicked_confirm_method = True
                    self.log("Clicked 'Continue' — Instagram is now sending the OTP via SMS to Messages!")
                    break
            except Exception:
                continue

        if clicked_confirm_method:
            page.wait_for_timeout(2500)

    def _fill_and_submit_otp(self, page: Page, code_val: str) -> bool:
        """
        Focus the Instagram OTP input box, clear any previous attempt, enter `code_val`,
        and submit via the Confirm/Continue button or Enter key.
        """
        try:
            page.bring_to_front()
        except Exception:
            pass

        selectors = [
            'input[name="verificationCode"]',
            'input[autocomplete="one-time-code"]',
            'input[aria-label*="Security Code" i]',
            'input[aria-label*="verification code" i]',
            'input[aria-label*="code" i]',
            'input[name*="code" i]',
            'input[placeholder*="code" i]',
            'input[type="tel"]',
            'input[type="number"]',
            'input[type="text"]',
        ]

        target_input = None
        for sel in selectors:
            try:
                loc = page.locator(sel)
                if loc.count() > 0 and loc.first.is_visible():
                    target_input = loc.first
                    break
            except Exception:
                continue

        if not target_input:
            self.log("Could not locate OTP input box on page yet.")
            return False

        try:
            target_input.click()
            page.wait_for_timeout(150)
            target_input.press("Meta+a")
            target_input.press("Backspace")
            target_input.fill("")
            page.wait_for_timeout(150)

            target_input.press_sequentially(code_val, delay=60)
            page.wait_for_timeout(500)

            clicked_submit = False
            for btn_name in ["Confirm", "Continue", "Submit", "Next", "Verify"]:
                try:
                    btn = page.get_by_role("button", name=btn_name)
                    if btn.count() > 0 and btn.first.is_visible() and btn.first.is_enabled():
                        self.log(f"Clicking '{btn_name}' button to verify OTP...")
                        btn.first.click()
                        clicked_submit = True
                        break
                except Exception:
                    continue

            if not clicked_submit:
                try:
                    submit_btn = page.locator(
                        'button[type="submit"], '
                        'div[role="button"]:has-text("Confirm"), '
                        'div[role="button"]:has-text("Continue"), '
                        'div[role="button"]:has-text("Submit")'
                    ).first
                    if submit_btn.is_visible():
                        submit_btn.click()
                        clicked_submit = True
                except Exception:
                    pass

            if not clicked_submit:
                self.log("Pressing Enter to submit OTP...")
                target_input.press("Enter")

            return True
        except Exception as err:
            self.log(f"Error entering OTP into Instagram box: {err}")
            return False

    def _execute_sync(self):
        load_dotenv(override=True)
        account_id = os.getenv("ACCOUNT_ID") or os.getenv("INSTAGRAM_USERNAME") or "ishan_roy31"
        account_password = os.getenv("ACCOUNT_PASSWORD")

        if not account_password:
            raise ValueError("ACCOUNT_PASSWORD not configured in .env.")

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        all_posts_url = f"https://www.instagram.com/{account_id}/saved/all-posts/"

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
                page.wait_for_timeout(3500)

                # Check if login is needed
                if "/accounts/login" in page.url or "login" in page.url.lower():
                    self.log("Instagram login required. Starting login flow...")

                    # Capture baseline Messages ROWID, WhatsApp Z_PK & Clipboard BEFORE submitting login
                    baseline_msg_rowid = get_baseline_message_rowid()
                    baseline_wa_pk = get_baseline_whatsapp_pk()
                    baseline_clipboard = get_clipboard_content()
                    login_click_ts = time.time()

                    # Execute returning-account ('Continue' -> password) or first-time (username + password) flow
                    self._perform_login_flow(page, account_id, account_password)

                    # Wait for navigation to either 2FA or logged-in state
                    in_2fa = False
                    for _ in range(15):
                        if self._stop_requested:
                            return
                        page.wait_for_timeout(1000)
                        if self._is_on_2fa_page(page):
                            in_2fa = True
                            break
                        if self._is_logged_in_past_auth(page):
                            break

                    # If 2FA triggered:
                    # 1. If Instagram sent OTP to WhatsApp, click 'Try another way' -> 'Text message' -> 'Continue'
                    #    (if already sent to Messages/SMS, keep it as is).
                    # 2. Open macOS Messages app, wait for Instagram OTP in ~/Library/Messages/chat.db,
                    #    enter it in the OTP box, and continue!
                    if in_2fa or self._is_on_2fa_page(page):
                        self.log("2-Factor Authentication required by Instagram.")
                        self._switch_2fa_to_sms_if_needed(page)

                        # Open the macOS Messages app so iCloud / iPhone SMS Forwarding syncs immediately
                        self.log("Opening macOS Messages app and waiting for Instagram SMS OTP...")
                        open_messages_app(background=False)

                        msg_check = check_messages_db_access()
                        has_msg_access = msg_check.get("accessible", False)
                        if has_msg_access:
                            auto_msg = (
                                f"Watching macOS Messages DB (after ROWID #{baseline_msg_rowid}) for Instagram SMS OTP..."
                            )
                            self.log(
                                f"macOS Messages DB connected (baseline ROWID #{baseline_msg_rowid}). Waiting for Instagram OTP..."
                            )
                        else:
                            auto_msg = "Watching macOS Messages & Universal Clipboard for Instagram OTP..."
                            self.log("Watching macOS Messages & Universal Clipboard for Instagram OTP...")

                        with self._lock:
                            self.status = "awaiting_otp"
                            self.awaiting_otp = True
                            self.messages_access = has_msg_access
                            self.auto_otp_status = auto_msg
                            self.stage = "Waiting for Instagram OTP in macOS Messages (auto-detecting)..."
                            self.otp_prompt = (
                                "Curio switched 2FA to SMS (if needed), opened macOS Messages, and is watching for your "
                                "Instagram verification code to enter it automatically:"
                            )

                        tried_codes: Set[str] = set()
                        seen_phone_only_pks: Set[int] = set()
                        start_time = time.time()
                        otp_verified = False
                        last_log_time = time.time()

                        while time.time() - start_time < 300:
                            if self._stop_requested:
                                return

                            # Check if 2FA already completed in the browser window
                            if self._is_logged_in_past_auth(page):
                                self.log("2FA verification passed!")
                                otp_verified = True
                                break

                            candidate_otp: Optional[str] = None
                            candidate_source: Optional[str] = None

                            # 1. Check manual OTP submitted via Curio modal
                            if self._pending_otp:
                                candidate_otp = self._pending_otp
                                self._pending_otp = None
                                candidate_source = "Curio manual input"

                            # 2. Primary: Poll macOS Messages SQLite DB (~/Library/Messages/chat.db)
                            if not candidate_otp:
                                otp_msg, src_msg, err_msg = query_recent_messages_for_otp(
                                    baseline_rowid=baseline_msg_rowid,
                                    since_unix_ts=login_click_ts,
                                    tried_codes=tried_codes,
                                )
                                if otp_msg:
                                    candidate_otp = otp_msg
                                    candidate_source = src_msg

                            # 3. Secondary: Poll macOS Universal Clipboard (pbpaste)
                            if not candidate_otp:
                                otp_clip, src_clip = poll_clipboard_for_otp(
                                    baseline_clipboard=baseline_clipboard,
                                    tried_codes=tried_codes,
                                )
                                if otp_clip:
                                    candidate_otp = otp_clip
                                    candidate_source = src_clip

                            # 4. Tertiary: Poll WhatsApp DB (in case readable OTP text arrived there)
                            if not candidate_otp:
                                otp_wa, src_wa, _, _ = query_recent_whatsapp_for_otp(
                                    baseline_pk=baseline_wa_pk,
                                    since_unix_ts=login_click_ts,
                                    tried_codes=tried_codes,
                                    seen_phone_only_pks=seen_phone_only_pks,
                                )
                                if otp_wa:
                                    candidate_otp = otp_wa
                                    candidate_source = src_wa

                            # If we found an OTP from any source, enter it in Instagram's OTP box and test it!
                            if candidate_otp:
                                tried_codes.add(candidate_otp)
                                self.log(f"Found Instagram OTP [{candidate_otp}] via {candidate_source}! Entering into OTP box...")
                                with self._lock:
                                    self.stage = f"Submitting OTP {candidate_otp} (from {candidate_source})..."
                                    self.auto_otp_status = f"Trying OTP {candidate_otp} from {candidate_source}..."

                                submitted = self._fill_and_submit_otp(page, candidate_otp)
                                if submitted:
                                    for _ in range(16):
                                        if self._stop_requested:
                                            return
                                        page.wait_for_timeout(500)
                                        if self._is_logged_in_past_auth(page):
                                            otp_verified = True
                                            break
                                    if otp_verified:
                                        self.log(f"OTP [{candidate_otp}] accepted by Instagram! 2FA complete.")
                                        break
                                    else:
                                        self.log(
                                            f"OTP [{candidate_otp}] did not advance past 2FA yet. "
                                            "Continuing to watch macOS Messages for a newer OTP code..."
                                        )
                                        with self._lock:
                                            self.stage = "Waiting for newer Instagram OTP in macOS Messages..."
                                            self.auto_otp_status = (
                                                f"Tried {candidate_otp}; watching macOS Messages for a newer OTP..."
                                            )

                            if time.time() - last_log_time >= 20:
                                elapsed = int(time.time() - start_time)
                                self.log(f"Still watching macOS Messages for Instagram OTP ({elapsed}s elapsed)...")
                                last_log_time = time.time()

                            time.sleep(1.2)

                        with self._lock:
                            self.awaiting_otp = False
                            self.auto_otp_status = None
                            self.status = "running"

                        if not otp_verified:
                            raise TimeoutError("Timed out waiting for Instagram 2FA OTP verification.")

                # Bring browser window to front and dismiss post-login dialogs ("Save info", "Not now", etc.)
                try:
                    page.bring_to_front()
                except Exception:
                    pass

                page.wait_for_timeout(2500)
                for btn_text in ["Save info", "Save Info", "Not Now", "Not now", "Cancel"]:
                    try:
                        btn = page.get_by_role("button", name=btn_text)
                        if btn.count() > 0 and btn.first.is_visible():
                            self.log(f"Dismissing prompt: '{btn_text}'")
                            btn.first.click()
                            page.wait_for_timeout(1200)
                    except Exception:
                        pass

                # Persist authenticated session immediately after login/2FA succeeds
                try:
                    context.storage_state(path=str(SESSION_FILE))
                except Exception:
                    pass

                # Ensure we are on all_posts_url
                if "/saved/all-posts" not in page.url:
                    with self._lock:
                        self.stage = f"Opening saved posts collection for @{account_id}..."
                    self.log(f"Navigating to {all_posts_url}...")
                    page.goto(all_posts_url, timeout=60000)
                    page.wait_for_timeout(4000)

                # If redirected to /saved/ instead of /saved/all-posts/, click "All posts" tile
                if "/saved/all-posts" not in page.url:
                    try:
                        all_posts_tile = page.locator('a[href*="/saved/all-posts/"]').first
                        if all_posts_tile.is_visible(timeout=4000):
                            all_posts_tile.click()
                            page.wait_for_timeout(3500)
                    except Exception:
                        pass

                # Wait for saved post tiles to render in the grid
                try:
                    page.wait_for_selector('a[href*="/p/"], a[href*="/reel/"]', timeout=15000)
                except Exception:
                    pass

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

                    has_video = False
                    has_reel_link = False
                    has_audio = False
                    try:
                        has_video = dialog.locator("video").count() > 0
                        has_reel_link = dialog.locator('a[href*="/reel/"], a[href*="/reels/"]').count() > 0
                        has_audio = (
                            dialog.locator('a[href*="/audio/"]').count() > 0 or
                            dialog.locator('svg[aria-label*="Audio"], svg[aria-label*="Reel"], svg[aria-label*="Clip"]').count() > 0
                        )
                    except Exception:
                        pass

                    is_reel = ("/reel/" in curr_url) or has_video or has_reel_link or has_audio
                    post_type = "reel" if is_reel else "post"
                    exact_browser_url = (
                        f"https://www.instagram.com/reel/{shortcode}/"
                        if is_reel
                        else f"https://www.instagram.com/p/{shortcode}/"
                    )

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

                    # 3. Hashtags
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
                        "url": exact_browser_url,
                        "caption": caption,
                        "hashtags": hashtags,
                        "owner": owner_data,
                        "brand_partner": None,
                        "saved_at": None,
                        "saved_at_iso": None,
                    }
                    new_extracted.append(item_record)
                    self.log(f"Extracted [{len(new_extracted)}] #{shortcode} ({post_type}) -> {exact_browser_url} by @{owner_username or 'unknown'}")

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
