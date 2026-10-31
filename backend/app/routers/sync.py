"""
FastAPI Router for Instagram Sync endpoints.
Provides real-time status, automatic macOS Messages OTP monitoring, interactive OTP handling, and sync triggering.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.instagram_sync import sync_manager
from app.services.messages_otp import check_messages_db_access, open_full_disk_access_settings, open_whatsapp_app

router = APIRouter(prefix="/api/sync", tags=["sync"])


class OTPRequest(BaseModel):
    code: str


class SyncLogItem(BaseModel):
    time: str
    message: str


class SyncStatusResponse(BaseModel):
    status: str
    stage: str
    awaiting_otp: bool
    otp_prompt: Optional[str] = None
    auto_otp_status: Optional[str] = None
    messages_access: bool = False
    error: Optional[str] = None
    new_count: int
    logs: List[SyncLogItem]


@router.post("/start")
def start_sync():
    """Start the Playwright automated sync process."""
    result = sync_manager.start_sync()
    return result


@router.get("/status", response_model=SyncStatusResponse)
def get_sync_status():
    """Poll current sync status, logs, and whether 2FA OTP is required."""
    return sync_manager.get_state()


@router.post("/otp")
def submit_otp(req: OTPRequest):
    """Submit 2FA OTP code to the active Playwright browser session."""
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="OTP code cannot be empty.")
    result = sync_manager.submit_otp(req.code)
    return result


@router.post("/cancel")
def cancel_sync():
    """Cancel the active sync process and close browser."""
    result = sync_manager.cancel_sync()
    return result


@router.get("/messages-access")
def get_messages_access() -> Dict[str, Any]:
    """Check whether macOS Messages database (~/Library/Messages/chat.db) is readable."""
    return check_messages_db_access()


@router.post("/open-permissions")
def open_permissions() -> Dict[str, Any]:
    """Open macOS System Settings -> Full Disk Access and WhatsApp.app."""
    opened_settings = open_full_disk_access_settings()
    opened_wa = open_whatsapp_app(background=True)
    return {
        "success": opened_settings or opened_wa,
        "message": "Opened macOS Full Disk Access settings & WhatsApp.",
    }
