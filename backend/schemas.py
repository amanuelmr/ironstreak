"""Pydantic response schemas for Ironstreak."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class GoalOut(BaseModel):
    id: int
    title: str
    description: str | None
    created_at: datetime


class StreakDayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date
    status: str
    proof_link: str | None
    proof_note: str | None
    duration_minutes: int | None
    submitted_at: datetime | None
    reminder_count: int


class TodayCheckinOut(BaseModel):
    date: date
    status: str
    proof_link: str | None
    proof_note: str | None
    duration_minutes: int | None
    submitted_at: datetime | None
    reminder_count: int


class CheckinResultOut(TodayCheckinOut):
    current_streak: int
    longest_streak: int


class StreakOut(BaseModel):
    current_streak: int
    longest_streak: int
    today_status: str
    goal_title: str | None
    goal_description: str | None
    timezone: str
    server_today: date


class StatsOut(BaseModel):
    total_submitted_days: int
    total_failed_days: int
    completion_rate: float
    total_minutes_logged: int
    total_hours_logged: float
    current_streak: int
    longest_streak: int


class ReminderStatusOut(BaseModel):
    next_reminder_at: datetime | None
    reminders_sent_today: int
    deadline: str


class HealthOut(BaseModel):
    status: str
