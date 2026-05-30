"""APScheduler jobs for Ironstreak."""

import os
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from database import SessionLocal
from models import AppState, StreakDay

REMINDER_TIMES = (
    time(20, 0),
    time(21, 0),
    time(21, 30),
    time(22, 0),
    time(22, 30),
    time(23, 0),
    time(23, 30),
)

_scheduler: BackgroundScheduler | None = None


def get_timezone() -> ZoneInfo:
    return ZoneInfo(os.getenv("TZ", "Africa/Addis_Ababa"))


def local_now() -> datetime:
    return datetime.now(get_timezone())


def today_local_date() -> date:
    return local_now().date()


def get_app_state(db: Session) -> AppState:
    state = db.get(AppState, 1)
    if state is None:
        state = AppState(
            id=1,
            current_streak=0,
            longest_streak=0,
            last_updated=local_now(),
        )
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


def get_or_create_today(db: Session) -> StreakDay:
    today = today_local_date()
    streak_day = db.query(StreakDay).filter(StreakDay.date == today).one_or_none()
    if streak_day is None:
        streak_day = StreakDay(date=today, status="pending", reminder_count=0)
        db.add(streak_day)
        db.commit()
        db.refresh(streak_day)
    return streak_day


def daily_reset_job() -> None:
    with SessionLocal() as db:
        get_or_create_today(db)


def reminder_job() -> None:
    with SessionLocal() as db:
        streak_day = get_or_create_today(db)
        if streak_day.status == "pending":
            streak_day.reminder_count += 1
            db.commit()


def midnight_fail_job() -> None:
    with SessionLocal() as db:
        streak_day = get_or_create_today(db)
        state = get_app_state(db)

        if streak_day.status != "submitted":
            streak_day.status = "failed"
            state.current_streak = 0
            state.last_updated = local_now()
            db.commit()


def next_reminder_at(streak_day: StreakDay | None = None) -> datetime | None:
    now = local_now()
    if streak_day is not None and streak_day.status != "pending":
        return None

    for reminder_time in REMINDER_TIMES:
        candidate = datetime.combine(now.date(), reminder_time, tzinfo=get_timezone())
        if candidate > now:
            return candidate
    return None


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return _scheduler

    scheduler = BackgroundScheduler(timezone=get_timezone())
    scheduler.add_job(daily_reset_job, "cron", hour=0, minute=1, id="daily_reset")
    scheduler.add_job(midnight_fail_job, "cron", hour=23, minute=59, id="midnight_fail")

    for index, reminder_time in enumerate(REMINDER_TIMES, start=1):
        scheduler.add_job(
            reminder_job,
            "cron",
            hour=reminder_time.hour,
            minute=reminder_time.minute,
            id=f"reminder_{index}",
        )

    scheduler.start()
    _scheduler = scheduler
    return scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown()
    _scheduler = None
