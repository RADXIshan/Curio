"""
FastAPI Router for Instagram Sync endpoints.
Provides real-time status, interactive OTP handling, and sync triggering.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.instagram_sync import sync_manager

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
