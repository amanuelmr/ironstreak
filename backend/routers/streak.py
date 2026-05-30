"""Streak API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Goal, StreakDay
from scheduler import get_app_state, get_or_create_today

router = APIRouter(tags=["streak"])


def _active_goal(db: Session) -> Goal | None:
    return db.query(Goal).filter(Goal.is_active.is_(True)).order_by(Goal.id.desc()).first()


@router.get("/api/streak")
def get_streak(db: Annotated[Session, Depends(get_db)]) -> dict:
    state = get_app_state(db)
    today = get_or_create_today(db)
    goal = _active_goal(db)

    return {
        "current_streak": state.current_streak,
        "longest_streak": state.longest_streak,
        "today_status": today.status,
        "goal_title": goal.title if goal else None,
    }


@router.get("/api/history")
def get_history(db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = (
        db.query(StreakDay)
        .order_by(StreakDay.date.desc())
        .limit(30)
        .all()
    )

    return [
        {
            "id": row.id,
            "date": row.date,
            "status": row.status,
            "proof_link": row.proof_link,
            "proof_note": row.proof_note,
            "duration_minutes": row.duration_minutes,
            "submitted_at": row.submitted_at,
            "reminder_count": row.reminder_count,
        }
        for row in rows
    ]
