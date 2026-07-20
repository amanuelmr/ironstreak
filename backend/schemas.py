"""Pydantic response schemas for Ironstreak."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class HealthOut(BaseModel):
    status: str


class OverviewOut(BaseModel):
    current_streak: int
    longest_streak: int
    active_count: int
    completed_count: int
    total_hours_logged: float
    timezone: str
    server_today: date


class ActivityDayOut(BaseModel):
    date: date
    entry_count: int
    minutes: int


class ChallengeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    start_date: date | None = None
    end_date: date
    requires_daily_checkin: bool = False

    @model_validator(mode="after")
    def _check_dates(self) -> "ChallengeCreate":
        if self.start_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class ChallengeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: Literal["active", "completed"] | None = None
    requires_daily_checkin: bool | None = None

    @model_validator(mode="after")
    def _check_dates(self) -> "ChallengeUpdate":
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.end_date < self.start_date
        ):
            raise ValueError("end_date must be on or after start_date")
        return self


class ChallengeEntryCreate(BaseModel):
    note: str = Field(min_length=1)
    link: str | None = None
    duration_minutes: int | None = Field(default=None, ge=1)


class ChallengeEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    note: str
    link: str | None
    duration_minutes: int | None
    logged_at: datetime


class ChallengeOut(BaseModel):
    id: int
    title: str
    description: str | None
    start_date: date
    end_date: date
    status: str
    requires_daily_checkin: bool
    created_at: datetime
    completed_at: datetime | None
    entry_count: int
    is_overdue: bool
    days_remaining: int
    current_streak: int
    best_streak: int


class ChallengeDetailOut(ChallengeOut):
    entries: list[ChallengeEntryOut]
