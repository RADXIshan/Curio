"""
macOS Messages, Clipboard & WhatsApp OTP Watcher for Curio Instagram Sync.
Automatically opens Messages.app, monitors ~/Library/Messages/chat.db (including modern
macOS Ventura/Sonoma/Sequoia attributedBody blobs), Universal Clipboard (pbpaste),
and WhatsApp ChatStorage.sqlite for incoming Instagram 2FA verification codes.
"""

import logging
from pathlib import Path
import re
import sqlite3
import subprocess
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger(__name__)

CHAT_DB_PATH = Path.home() / "Library" / "Messages" / "chat.db"
WHATSAPP_DB_PATH = (
    Path.home()
    / "Library"
    / "Group Containers"
    / "group.net.whatsapp.WhatsApp.shared"
    / "ChatStorage.sqlite"
)

# Apple Cocoa CoreData epoch offset (seconds between 1970-01-01 and 2001-01-01)
APPLE_EPOCH_OFFSET = 978307200

# High-confidence keywords/senders identifying an Instagram/Meta 2FA message
INSTAGRAM_KEYWORDS = (
    "instagram",
    "instagram code",
    "meta",
    "facebook",
    "ig.me",
    "59039",
    "12066409886",
    "640-9886",
    "640‑9886",
    "88300266250384",
    "don't share it",
    "do not share",
)

# Known unrelated senders/keywords to ignore
NON_INSTAGRAM_IGNORE = (
    "digilocker",
    "axis bank",
    "indigo",
    "bookmyshow",
    "airtel",
    "flipkart",
    "snitch",
    "amazon",
    "swiggy",
    "zomato",
    "wearadhd",
    "goibibo",
    "h&m",
    "desiqna",
)


def check_messages_db_access() -> Dict[str, Any]:
    """Check whether ~/Library/Messages/chat.db exists and is readable by the current process."""
    if not CHAT_DB_PATH.exists():
        return {
            "accessible": False,
            "db_exists": False,
            "source": "messages",
            "error": f"Messages database not found at {CHAT_DB_PATH}",
        }

    try:
        uri = f"file:{CHAT_DB_PATH}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, timeout=2.0)
        try:
            cur = conn.cursor()
            cur.execute("SELECT MAX(ROWID) FROM message")
            max_rowid = cur.fetchone()[0] or 0
            return {
                "accessible": True,
                "db_exists": True,
                "source": "messages",
                "max_rowid": max_rowid,
                "error": None,
            }
        finally:
            conn.close()
    except Exception as err:
        return {
            "accessible": False,
            "db_exists": True,
            "source": "messages",
            "error": str(err),
        }


def check_whatsapp_db_access() -> Dict[str, Any]:
    """Check whether WhatsApp's ChatStorage.sqlite exists and is readable."""
    if not WHATSAPP_DB_PATH.exists():
        return {
            "accessible": False,
            "db_exists": False,
            "error": f"WhatsApp database not found at {WHATSAPP_DB_PATH}",
        }

    try:
        uri = f"file:{WHATSAPP_DB_PATH}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, timeout=2.5)
        try:
            cur = conn.cursor()
            cur.execute("SELECT MAX(Z_PK) FROM ZWAMESSAGE")
            max_pk = cur.fetchone()[0] or 0
            return {
                "accessible": True,
                "db_exists": True,
                "max_pk": max_pk,
                "error": None,
            }
        finally:
            conn.close()
    except Exception as err:
        return {
            "accessible": False,
            "db_exists": True,
            "error": str(err),
        }


def open_messages_app(background: bool = False) -> bool:
    """Launch or bring the macOS Messages app to the foreground so iCloud/SMS forwarding syncs immediately."""
    try:
        cmd = ["open", "-a", "Messages"]
        if background:
            cmd.insert(1, "-g")
        subprocess.run(cmd, check=False, timeout=5)
        return True
    except Exception as err:
        logger.warning(f"Failed to open Messages.app: {err}")
        return False


def open_whatsapp_app(background: bool = False) -> bool:
    """Launch or bring the macOS WhatsApp app to the foreground."""
    try:
        cmd = ["open", "-a", "WhatsApp"]
        if background:
            cmd.insert(1, "-g")
        subprocess.run(cmd, check=False, timeout=5)
        return True
    except Exception as err:
        logger.warning(f"Failed to open WhatsApp.app: {err}")
        return False


def open_full_disk_access_settings() -> bool:
    """Open macOS System Settings -> Privacy & Security -> Full Disk Access."""
    try:
        subprocess.run(
            [
                "open",
                "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
            ],
            check=False,
            timeout=5,
        )
        return True
    except Exception as err:
        logger.warning(f"Failed to open Full Disk Access settings: {err}")
        return False


def extract_text_from_attributed_body(blob: Optional[bytes]) -> str:
    """
    Decode the plain-text string from macOS Messages `attributedBody` binary column.
    On macOS Ventura (13+), Sonoma (14+), and Sequoia (15+), incoming SMS/iMessage rows
    frequently have `message.text = NULL` and store the message inside `attributedBody`
    (an Apple typedstream-serialized NSAttributedString).
    """
    if not blob:
        return ""

    try:
        for marker in (b"NSString", b"NSMutableString"):
            idx = blob.find(marker)
            if idx != -1:
                sub = blob[idx + len(marker) :]
                plus_idx = sub.find(b"+")
                if 0 <= plus_idx <= 12:
                    pos = plus_idx + 1
                    if pos < len(sub):
                        length_byte = sub[pos]
                        pos += 1
                        if length_byte < 0x80:
                            str_len = length_byte
                        elif length_byte == 0x81 and pos + 2 <= len(sub):
                            str_len = int.from_bytes(sub[pos : pos + 2], "little")
                            pos += 2
                        elif length_byte == 0x82 and pos + 4 <= len(sub):
                            str_len = int.from_bytes(sub[pos : pos + 4], "little")
                            pos += 4
                        else:
                            str_len = 0

                        if 0 < str_len <= len(sub) - pos:
                            decoded = sub[pos : pos + str_len].decode("utf-8", errors="ignore").strip()
                            if decoded:
                                return decoded
    except Exception:
        pass

    try:
        text_raw = blob.decode("utf-8", errors="ignore")
        if "NSString" in text_raw:
            text_raw = text_raw.split("NSString", 1)[1]
        if "NSDictionary" in text_raw:
            text_raw = text_raw.split("NSDictionary", 1)[0]
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]+", " ", text_raw).strip()
        return cleaned
    except Exception:
        return ""


def extract_text_from_whatsapp_metadata(blob: Optional[bytes]) -> str:
    """Extract readable UTF-8 text from WhatsApp's `ZWAMEDIAITEM.ZMETADATA` protobuf blob."""
    if not blob:
        return ""
    try:
        raw = blob.decode("utf-8", errors="ignore")
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]+", " ", raw).strip()
        return cleaned
    except Exception:
        return ""


def extract_otp_from_text(text: str, require_keyword: bool = True) -> Optional[str]:
    """
    Extract a 6-digit (or 8-digit) Instagram verification code from a message body.
    Handles both contiguous codes ("123456 is your Instagram code") and space/hyphen-split
    codes ("454 586 is your Instagram code. Don't share it.").
    """
    if not text:
        return None

    clean = text.strip()
    lower = clean.lower()

    if any(ignore_kw in lower for ignore_kw in NON_INSTAGRAM_IGNORE):
        return None

    has_keyword = any(kw in lower for kw in INSTAGRAM_KEYWORDS) or bool(
        re.search(r"\binstagram\b|\big\s+code\b|\bsecurity\s+code\b|\bverification\s+code\b", lower)
    )
    if require_keyword and not has_keyword:
        return None

    # Remove URLs, JIDs, and phone numbers starting with '+' so digits inside them aren't matched as OTPs
    scrubbed = re.sub(r"https?://\S+", " ", clean)
    scrubbed = re.sub(r"\S+@(?:lid|s\.whatsapp\.net|g\.us|newsletter)", " ", scrubbed)
    scrubbed = re.sub(r"\+[\d\s\-\(\)\u00a0\u2011]{7,20}", " ", scrubbed)
    scrubbed = re.sub(r"\b12066409886\b", " ", scrubbed)

    # Pattern 1: Instagram's classic split 6-digit SMS format: "454 586" or "454-586"
    m_split = re.search(r"(?<!\d)(\d{3})[\s\-](\d{3})(?!\d)", scrubbed)
    if m_split:
        return f"{m_split.group(1)}{m_split.group(2)}"

    # Pattern 2: Contiguous 6-digit code
    m_six = re.search(r"(?<!\d)(\d{6})(?!\d)", scrubbed)
    if m_six:
        return m_six.group(1)

    # Pattern 3: Contiguous 8-digit backup/security code
    m_eight = re.search(r"(?<!\d)(\d{8})(?!\d)", scrubbed)
    if m_eight:
        return m_eight.group(1)

    return None


def get_baseline_message_rowid() -> int:
    """Return the current maximum message.ROWID in ~/Library/Messages/chat.db, or 0."""
    status = check_messages_db_access()
    if status.get("accessible"):
        return int(status.get("max_rowid") or 0)
    return 0


def get_baseline_whatsapp_pk() -> int:
    """Return the current maximum ZWAMESSAGE.Z_PK in WhatsApp's ChatStorage.sqlite, or 0."""
    status = check_whatsapp_db_access()
    if status.get("accessible"):
        return int(status.get("max_pk") or 0)
    return 0


def get_clipboard_content() -> str:
    """Read current macOS pasteboard text via pbpaste."""
    try:
        res = subprocess.run(["pbpaste"], capture_output=True, text=True, timeout=2)
        if res.returncode == 0:
            return (res.stdout or "").strip()
    except Exception:
        pass
    return ""


def query_recent_messages_for_otp(
    baseline_rowid: int,
    since_unix_ts: float,
    tried_codes: Set[str],
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Primary watcher: Query Apple Messages (~/Library/Messages/chat.db) for a new Instagram SMS OTP
    arriving after `baseline_rowid` (or after `since_unix_ts`).

    Returns: (otp_code, source_description, error_message)
    """
    if not CHAT_DB_PATH.exists():
        return None, None, "Messages database not found"

    try:
        uri = f"file:{CHAT_DB_PATH}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, timeout=2.5)
        try:
            cur = conn.cursor()
            if baseline_rowid > 0:
                query = """
                    SELECT
                        m.ROWID,
                        m.text,
                        m.attributedBody,
                        m.date,
                        m.is_from_me,
                        COALESCE(h.id, '') as sender
                    FROM message m
                    LEFT JOIN handle h ON m.handle_id = h.ROWID
                    WHERE m.ROWID > ?
                    ORDER BY m.ROWID DESC
                    LIMIT 20
                """
                cur.execute(query, (baseline_rowid,))
            else:
                lookback_ts = max(0.0, since_unix_ts - 5.0)
                apple_ns_min = int((lookback_ts - APPLE_EPOCH_OFFSET) * 1_000_000_000)
                query = """
                    SELECT
                        m.ROWID,
                        m.text,
                        m.attributedBody,
                        m.date,
                        m.is_from_me,
                        COALESCE(h.id, '') as sender
                    FROM message m
                    LEFT JOIN handle h ON m.handle_id = h.ROWID
                    WHERE m.date >= ?
                    ORDER BY m.ROWID DESC
                    LIMIT 20
                """
                cur.execute(query, (apple_ns_min,))

            rows = cur.fetchall()
            fallback_candidates: List[Tuple[str, str]] = []

            for rowid, text_col, attr_blob, msg_date, is_from_me, sender in rows:
                body = (text_col or "").strip()
                if not body and attr_blob:
                    body = extract_text_from_attributed_body(attr_blob)
                if not body:
                    continue

                # 1. High-confidence match: contains Instagram/Meta identifier or sender
                code = extract_otp_from_text(f"{sender} {body}", require_keyword=True)
                if code and code not in tried_codes:
                    return code, f"macOS Messages (ROWID #{rowid} from {sender or 'SMS'})", None

                # 2. If this SMS arrived strictly AFTER we started login (rowid > baseline_rowid),
                # also check if it's a short OTP message even if the carrier omitted 'Instagram'
                if baseline_rowid > 0 and rowid > baseline_rowid and not is_from_me:
                    if any(w in body.lower() for w in ("code", "otp", "verification", "security", "password")):
                        code_any = extract_otp_from_text(body, require_keyword=False)
                        if code_any and code_any not in tried_codes and len(body) < 160:
                            fallback_candidates.append(
                                (code_any, f"macOS Messages SMS (ROWID #{rowid} from {sender or 'SMS'})")
                            )

            if fallback_candidates:
                return fallback_candidates[0][0], fallback_candidates[0][1], None

            return None, None, None
        finally:
            conn.close()
    except Exception as err:
        return None, None, str(err)


def query_recent_whatsapp_for_otp(
    baseline_pk: int,
    since_unix_ts: float,
    tried_codes: Set[str],
    seen_phone_only_pks: Set[int],
) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """
    Secondary watcher: Query WhatsApp's ChatStorage.sqlite in case a readable OTP arrives there.
    """
    if not WHATSAPP_DB_PATH.exists():
        return None, None, None, "WhatsApp database not found"

    try:
        uri = f"file:{WHATSAPP_DB_PATH}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, timeout=2.0)
        try:
            cur = conn.cursor()
            apple_sec_min = max(0.0, since_unix_ts - 10.0) - APPLE_EPOCH_OFFSET

            if baseline_pk > 0:
                query = """
                    SELECT
                        m.Z_PK,
                        m.ZTEXT,
                        m.ZMESSAGETYPE,
                        m.ZISFROMME,
                        m.ZMESSAGEDATE,
                        COALESCE(cs.ZPARTNERNAME, '') as partner_name,
                        COALESCE(cs.ZCONTACTJID, '') as contact_jid,
                        COALESCE(cs.ZCONTACTIDENTIFIER, '') as contact_id,
                        mi.ZMETADATA
                    FROM ZWAMESSAGE m
                    LEFT JOIN ZWACHATSESSION cs ON m.ZCHATSESSION = cs.Z_PK
                    LEFT JOIN ZWAMEDIAITEM mi ON m.ZMEDIAITEM = mi.Z_PK
                    WHERE m.Z_PK > ? AND m.ZMESSAGEDATE >= ?
                    ORDER BY m.Z_PK DESC
                    LIMIT 15
                """
                cur.execute(query, (baseline_pk, apple_sec_min))
            else:
                return None, None, None, None

            for (
                zpk,
                ztext,
                msg_type,
                is_from_me,
                msg_date,
                partner_name,
                contact_jid,
                contact_id,
                zmetadata,
            ) in cur.fetchall():
                if "@g.us" in contact_jid or "@newsletter" in contact_jid:
                    continue

                text_body = (ztext or "").strip()
                meta_body = extract_text_from_whatsapp_metadata(zmetadata)
                combined_body = f"{text_body} {meta_body}".strip()
                sender_label = partner_name or contact_id or contact_jid or "WhatsApp"

                if combined_body:
                    code = extract_otp_from_text(f"{sender_label} {combined_body}", require_keyword=True)
                    if code and code not in tried_codes:
                        return code, f"WhatsApp ({sender_label}, msg #{zpk})", None, None

                if text_body and re.fullmatch(r"\d{3}[\s\-]?\d{3}|\d{8}", text_body):
                    clean_code = re.sub(r"[\s\-]", "", text_body)
                    if clean_code not in tried_codes:
                        return clean_code, f"WhatsApp ({sender_label}, msg #{zpk})", None, None

            return None, None, None, None
        finally:
            conn.close()
    except Exception as err:
        return None, None, None, str(err)


def poll_clipboard_for_otp(
    baseline_clipboard: str,
    tried_codes: Set[str],
) -> Tuple[Optional[str], Optional[str]]:
    """
    Check if a new OTP code was copied to the macOS Universal Clipboard.
    """
    curr = get_clipboard_content()
    if not curr or curr == baseline_clipboard:
        return None, None

    if re.fullmatch(r"\d{3}[\s\-]?\d{3}|\d{8}", curr):
        clean_code = re.sub(r"[\s\-]", "", curr)
        if clean_code not in tried_codes:
            return clean_code, "macOS Universal Clipboard"

    code = extract_otp_from_text(curr, require_keyword=True)
    if code and code not in tried_codes:
        return code, "macOS Universal Clipboard"

    return None, None
