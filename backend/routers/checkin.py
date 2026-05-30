"""Check-in API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.orm import Session

from database import get_db
from models import Goal
from scheduler import (
    get_app_state,
    get_or_create_today,
    local_now,
    next_reminder_at,
    today_local_date,
)

router = APIRouter(prefix="/api/checkin", tags=["checkin"])
reminder_router = APIRouter(prefix="/api/reminder", tags=["reminder"])


class CheckinRequest(BaseModel):
    proof_link: HttpUrl
    proof_note: str | None = None
    duration_minutes: int = Field(ge=60)


def _has_active_goal(db: Session) -> bool:
    return db.query(Goal.id).filter(Goal.is_active.is_(True)).first() is not None


def _serialize_today(db: Session) -> dict:
    today = get_or_create_today(db)
    return {
        "date": today.date,
        "status": today.status,
        "proof_link": today.proof_link,
        "proof_note": today.proof_note,
        "duration_minutes": today.duration_minutes,
        "submitted_at": today.submitted_at,
        "reminder_count": today.reminder_count,
    }


@router.post("")
def submit_checkin(payload: CheckinRequest, db: Annotated[Session, Depends(get_db)]) -> dict:
    if not _has_active_goal(db):
        raise HTTPException(status_code=400, detail="Set an active goal before submitting proof.")

    now = local_now()
    if now.date() != today_local_date():
        raise HTTPException(status_code=400, detail="Submission date boundary has already passed.")

    today = get_or_create_today(db)
    if today.status == "submitted":
        raise HTTPException(status_code=409, detail="Proof has already been submitted today.")
    if today.status == "failed":
        raise HTTPException(status_code=400, detail="Today's deadline has passed.")

    today.status = "submitted"
    today.proof_link = str(payload.proof_link)
    today.proof_note = payload.proof_note.strip() if payload.proof_note else None
    today.duration_minutes = payload.duration_minutes
    today.submitted_at = now

    state = get_app_state(db)
    state.current_streak += 1
    state.longest_streak = max(state.longest_streak, state.current_streak)
    state.last_updated = now
    db.commit()
    db.refresh(today)
    db.refresh(state)

    return {
        **_serialize_today(db),
        "current_streak": state.current_streak,
        "longest_streak": state.longest_streak,
    }


@router.get("/today")
def get_today_checkin(db: Annotated[Session, Depends(get_db)]) -> dict:
    return _serialize_today(db)


@reminder_router.get("/status")
def get_reminder_status(db: Annotated[Session, Depends(get_db)]) -> dict:
    today = get_or_create_today(db)
    upcoming = next_reminder_at(today)

    return {
        "next_reminder_at": upcoming,
        "reminders_sent_today": today.reminder_count,
        "deadline": "midnight",
    }
