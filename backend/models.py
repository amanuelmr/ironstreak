"""SQLAlchemy ORM models for Ironstreak."""

from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Text

from database import Base


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now)
    is_active = Column(Boolean, nullable=False, default=True, index=True)


class StreakDay(Base):
    __tablename__ = "streak_days"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default="pending", index=True)
    proof_link = Column(String(2048), nullable=True)
    proof_note = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reminder_count = Column(Integer, nullable=False, default=0)


class AppState(Base):
    __tablename__ = "app_state"

    id = Column(Integer, primary_key=True)
    current_streak = Column(Integer, nullable=False, default=0)
    longest_streak = Column(Integer, nullable=False, default=0)
    last_updated = Column(DateTime(timezone=True), nullable=False, default=datetime.now)
