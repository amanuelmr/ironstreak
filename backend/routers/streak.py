"""Streak API routes."""

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Goal, StreakDay
from scheduler import get_app_state, get_or_create_today, get_timezone, today_local_date
from schemas import StatsOut, StreakDayOut, StreakOut

router = APIRouter(tags=["streak"])


def _active_goal(db: Session) -> Goal | None:
    return db.query(Goal).filter(Goal.is_active.is_(True)).order_by(Goal.id.desc()).first()


@router.get("/api/streak", response_model=StreakOut)
def get_streak(db: Annotated[Session, Depends(get_db)]) -> dict:
    state = get_app_state(db)
    today = get_or_create_today(db)
    goal = _active_goal(db)

    return {
        "current_streak": state.current_streak,
        "longest_streak": state.longest_streak,
        "today_status": today.status,
        "goal_title": goal.title if goal else None,
        "goal_description": goal.description if goal else None,
        "timezone": get_timezone().key,
        "server_today": today_local_date(),
    }


@router.get("/api/history", response_model=list[StreakDayOut])
def get_history(
    db: Annotated[Session, Depends(get_db)],
    days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> list[StreakDay]:
    cutoff = today_local_date() - timedelta(days=days - 1)
    return (
        db.query(StreakDay)
        .filter(StreakDay.date >= cutoff)
        .order_by(StreakDay.date.desc())
        .all()
    )


@router.get("/api/stats", response_model=StatsOut)
def get_stats(db: Annotated[Session, Depends(get_db)]) -> dict:
    state = get_app_state(db)
    submitted_days = (
        db.query(func.count(StreakDay.id)).filter(StreakDay.status == "submitted").scalar() or 0
    )
    failed_days = (
        db.query(func.count(StreakDay.id)).filter(StreakDay.status == "failed").scalar() or 0
    )
    total_minutes = (
        db.query(func.coalesce(func.sum(StreakDay.duration_minutes), 0))
        .filter(StreakDay.status == "submitted")
        .scalar()
    )
    finished = submitted_days + failed_days

    return {
        "total_submitted_days": submitted_days,
        "total_failed_days": failed_days,
        "completion_rate": round(submitted_days / finished, 4) if finished else 0.0,
        "total_minutes_logged": int(total_minutes),
        "total_hours_logged": round(total_minutes / 60, 1),
        "current_streak": state.current_streak,
        "longest_streak": state.longest_streak,
    }
