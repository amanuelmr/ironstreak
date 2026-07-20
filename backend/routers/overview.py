"""Global overview + activity routes (iron streak across all challenges)."""

from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Challenge, ChallengeEntry
from schemas import ActivityDayOut, OverviewOut
from streaks import compute_streak
from timeutils import get_timezone, today_local_date

router = APIRouter(tags=["overview"])


@router.get("/api/overview", response_model=OverviewOut)
def get_overview(db: Annotated[Session, Depends(get_db)]) -> dict:
    today = today_local_date()
    entries = db.query(ChallengeEntry.logged_at, ChallengeEntry.duration_minutes).all()

    dates = {logged_at.date() for logged_at, _ in entries}
    current_streak, longest_streak = compute_streak(dates, today)
    total_minutes = sum(minutes or 0 for _, minutes in entries)

    active_count = db.query(Challenge).filter(Challenge.status == "active").count()
    completed_count = db.query(Challenge).filter(Challenge.status == "completed").count()

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "active_count": active_count,
        "completed_count": completed_count,
        "total_hours_logged": round(total_minutes / 60, 1),
        "timezone": get_timezone().key,
        "server_today": today,
    }


@router.get("/api/activity", response_model=list[ActivityDayOut])
def get_activity(
    db: Annotated[Session, Depends(get_db)],
    days: Annotated[int, Query(ge=1, le=365)] = 182,
) -> list[dict]:
    cutoff = today_local_date() - timedelta(days=days - 1)
    entries = db.query(ChallengeEntry.logged_at, ChallengeEntry.duration_minutes).all()

    by_day: dict[date, dict[str, int]] = {}
    for logged_at, minutes in entries:
        day = logged_at.date()
        if day < cutoff:
            continue
        bucket = by_day.setdefault(day, {"entry_count": 0, "minutes": 0})
        bucket["entry_count"] += 1
        bucket["minutes"] += minutes or 0

    return [
        {"date": day, "entry_count": bucket["entry_count"], "minutes": bucket["minutes"]}
        for day, bucket in sorted(by_day.items())
    ]
