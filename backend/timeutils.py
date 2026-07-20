"""Timezone-aware date/time helpers for Ironstreak."""

import os
from datetime import date, datetime
from zoneinfo import ZoneInfo


def get_timezone() -> ZoneInfo:
    return ZoneInfo(os.getenv("TZ", "Africa/Addis_Ababa"))


def local_now() -> datetime:
    return datetime.now(get_timezone())


def today_local_date() -> date:
    return local_now().date()
