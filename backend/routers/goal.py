"""Goal API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import Goal
from scheduler import local_now
from schemas import GoalOut

router = APIRouter(prefix="/api/goal", tags=["goal"])


class GoalRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None


@router.post("", response_model=GoalOut)
def create_goal(payload: GoalRequest, db: Annotated[Session, Depends(get_db)]) -> dict:
    db.query(Goal).filter(Goal.is_active.is_(True)).update({"is_active": False})
    goal = Goal(
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        created_at=local_now(),
        is_active=True,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return {
        "id": goal.id,
        "title": goal.title,
        "description": goal.description,
        "created_at": goal.created_at,
    }


@router.get("", response_model=GoalOut)
def get_goal(db: Annotated[Session, Depends(get_db)]) -> dict:
    goal = db.query(Goal).filter(Goal.is_active.is_(True)).order_by(Goal.id.desc()).first()
    if goal is None:
        raise HTTPException(status_code=404, detail="No active goal has been set.")

    return {
        "id": goal.id,
        "title": goal.title,
        "description": goal.description,
        "created_at": goal.created_at,
    }
