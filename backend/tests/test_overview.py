from datetime import datetime, timedelta

from models import Challenge, ChallengeEntry
from timeutils import today_local_date


def _seed_challenge(session_factory, *, status="active", start_offset=20, end_offset=20):
    today = today_local_date()
    with session_factory() as db:
        challenge = Challenge(
            title="C",
            start_date=today - timedelta(days=start_offset),
            end_date=today + timedelta(days=end_offset),
            status=status,
        )
        db.add(challenge)
        db.commit()
        return challenge.id


def _add_entry(session_factory, challenge_id, day_offset, minutes=None):
    today = today_local_date()
    with session_factory() as db:
        db.add(
            ChallengeEntry(
                challenge_id=challenge_id,
                note=f"day-{day_offset}",
                duration_minutes=minutes,
                logged_at=datetime.combine(today - timedelta(days=day_offset), datetime.min.time()),
            )
        )
        db.commit()


def test_overview_empty(client):
    body = client.get("/api/overview").json()
    assert body["current_streak"] == 0
    assert body["longest_streak"] == 0
    assert body["active_count"] == 0
    assert body["completed_count"] == 0
    assert body["total_hours_logged"] == 0.0
    assert body["timezone"] == "Africa/Addis_Ababa"
    assert body["server_today"] == today_local_date().isoformat()


def test_overview_global_streak_across_challenges(client, session_factory):
    a = _seed_challenge(session_factory)
    b = _seed_challenge(session_factory, status="completed")

    # Global "iron day" = any entry that day, across challenges.
    # Days: today(0), -1, -2 form a run of 3; then a gap at -3; -4, -5 older run of 2.
    _add_entry(session_factory, a, 0, minutes=60)
    _add_entry(session_factory, b, 1, minutes=90)  # different challenge, still counts
    _add_entry(session_factory, a, 2, minutes=30)
    _add_entry(session_factory, a, 4)
    _add_entry(session_factory, a, 5)

    body = client.get("/api/overview").json()
    assert body["current_streak"] == 3       # 0, -1, -2
    assert body["longest_streak"] == 3
    assert body["active_count"] == 1
    assert body["completed_count"] == 1
    assert body["total_hours_logged"] == 3.0  # (60+90+30)/60


def test_overview_current_streak_survives_until_a_full_missed_day(client, session_factory):
    a = _seed_challenge(session_factory)
    # logged yesterday but not today yet -> current streak still counts (=1)
    _add_entry(session_factory, a, 1)
    assert client.get("/api/overview").json()["current_streak"] == 1


def test_activity_shape_and_bounds(client, session_factory):
    a = _seed_challenge(session_factory)
    _add_entry(session_factory, a, 0, minutes=45)
    _add_entry(session_factory, a, 0, minutes=15)  # same day -> aggregated
    _add_entry(session_factory, a, 1, minutes=60)

    rows = client.get("/api/activity").json()
    assert len(rows) == 2
    today_row = [r for r in rows if r["date"] == today_local_date().isoformat()][0]
    assert today_row["entry_count"] == 2
    assert today_row["minutes"] == 60

    assert client.get("/api/activity?days=0").status_code == 422
    assert client.get("/api/activity?days=366").status_code == 422
    assert client.get("/api/activity?days=1").status_code == 200


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}
