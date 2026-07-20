"""Challenge API routes — time-boxed progress activities."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from database import get_db
from models import Challenge, ChallengeEntry
from schemas import (
    ChallengeCreate,
    ChallengeDetailOut,
    ChallengeEntryCreate,
    ChallengeEntryOut,
    ChallengeOut,
    ChallengeUpdate,
)
from streaks import compute_streak
from timeutils import local_now, today_local_date

router = APIRouter(prefix="/api/challenges", tags=["challenges"])


def _serialize(challenge: Challenge, today: date) -> dict:
    is_overdue = challenge.status == "active" and challenge.end_date < today

    current_streak = 0
    best_streak = 0
    if challenge.requires_daily_checkin:
        window_end = min(today, challenge.end_date)
        dates = {
            entry.logged_at.date()
            for entry in challenge.entries
            if challenge.start_date <= entry.logged_at.date() <= window_end
        }
        current_streak, best_streak = compute_streak(dates, window_end)

    return {
        "id": challenge.id,
        "title": challenge.title,
        "description": challenge.description,
        "start_date": challenge.start_date,
        "end_date": challenge.end_date,
        "status": challenge.status,
        "requires_daily_checkin": challenge.requires_daily_checkin,
        "created_at": challenge.created_at,
        "completed_at": challenge.completed_at,
        "entry_count": len(challenge.entries),
        "is_overdue": is_overdue,
        "days_remaining": (challenge.end_date - today).days,
        "current_streak": current_streak,
        "best_streak": best_streak,
    }


def _get_or_404(db: Session, challenge_id: int) -> Challenge:
    challenge = db.get(Challenge, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found.")
    return challenge


@router.post("", response_model=ChallengeOut, status_code=201)
def create_challenge(payload: ChallengeCreate, db: Annotated[Session, Depends(get_db)]) -> dict:
    today = today_local_date()
    start = payload.start_date or today
    if payload.end_date < start:
        raise HTTPException(status_code=422, detail="end_date must be on or after start_date.")

    challenge = Challenge(
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        start_date=start,
        end_date=payload.end_date,
        status="active",
        requires_daily_checkin=payload.requires_daily_checkin,
        created_at=local_now(),
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return _serialize(challenge, today)


@router.get("", response_model=list[ChallengeOut])
def list_challenges(
    db: Annotated[Session, Depends(get_db)],
    challenge_status: Annotated[str | None, Query(alias="status", pattern="^(active|completed)$")] = None,
) -> list[dict]:
    today = today_local_date()
    query = db.query(Challenge)
    if challenge_status is not None:
        query = query.filter(Challenge.status == challenge_status)
    rows = query.order_by(Challenge.created_at.desc(), Challenge.id.desc()).all()
    return [_serialize(row, today) for row in rows]


@router.get("/{challenge_id}", response_model=ChallengeDetailOut)
def get_challenge(challenge_id: int, db: Annotated[Session, Depends(get_db)]) -> dict:
    challenge = _get_or_404(db, challenge_id)
    today = today_local_date()
    return {
        **_serialize(challenge, today),
        "entries": [ChallengeEntryOut.model_validate(entry) for entry in challenge.entries],
    }


@router.patch("/{challenge_id}", response_model=ChallengeOut)
def update_challenge(
    challenge_id: int,
    payload: ChallengeUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    challenge = _get_or_404(db, challenge_id)

    if payload.title is not None:
        challenge.title = payload.title.strip()
    if payload.description is not None:
        challenge.description = payload.description.strip() or None
    if payload.start_date is not None:
        challenge.start_date = payload.start_date
    if payload.end_date is not None:
        challenge.end_date = payload.end_date
    if payload.requires_daily_checkin is not None:
        challenge.requires_daily_checkin = payload.requires_daily_checkin

    if challenge.end_date < challenge.start_date:
        raise HTTPException(status_code=422, detail="end_date must be on or after start_date.")

    if payload.status is not None and payload.status != challenge.status:
        challenge.status = payload.status
        challenge.completed_at = local_now() if payload.status == "completed" else None

    db.commit()
    db.refresh(challenge)
    return _serialize(challenge, today_local_date())


@router.delete("/{challenge_id}", status_code=204)
def delete_challenge(challenge_id: int, db: Annotated[Session, Depends(get_db)]) -> Response:
    challenge = _get_or_404(db, challenge_id)
    db.delete(challenge)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{challenge_id}/entries", response_model=ChallengeEntryOut, status_code=201)
def add_entry(
    challenge_id: int,
    payload: ChallengeEntryCreate,
    db: Annotated[Session, Depends(get_db)],
) -> ChallengeEntry:
    _get_or_404(db, challenge_id)
    entry = ChallengeEntry(
        challenge_id=challenge_id,
        note=payload.note.strip(),
        link=payload.link.strip() if payload.link else None,
        duration_minutes=payload.duration_minutes,
        logged_at=local_now(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{challenge_id}/entries/{entry_id}", status_code=204)
def delete_entry(
    challenge_id: int,
    entry_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    entry = db.get(ChallengeEntry, entry_id)
    if entry is None or entry.challenge_id != challenge_id:
        raise HTTPException(status_code=404, detail="Entry not found.")
    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
