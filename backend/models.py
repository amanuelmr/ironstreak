"""SQLAlchemy ORM models for Ironstreak."""

from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="active", index=True)
    requires_daily_checkin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    entries = relationship(
        "ChallengeEntry",
        back_populates="challenge",
        cascade="all, delete-orphan",
        order_by="ChallengeEntry.logged_at.desc()",
    )


class ChallengeEntry(Base):
    __tablename__ = "challenge_entries"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(
        Integer, ForeignKey("challenges.id"), nullable=False, index=True
    )
    note = Column(Text, nullable=False)
    link = Column(String(2048), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    logged_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now)

    challenge = relationship("Challenge", back_populates="entries")
