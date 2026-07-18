from datetime import timedelta

from models import AppState, StreakDay
from scheduler import today_local_date


def seed(session_factory):
    today = today_local_date()
    rows = [
        StreakDay(date=today - timedelta(days=1), status="submitted", duration_minutes=60),
        StreakDay(date=today - timedelta(days=2), status="submitted", duration_minutes=90),
        StreakDay(date=today - timedelta(days=3), status="submitted", duration_minutes=120),
        StreakDay(date=today - timedelta(days=4), status="failed"),
        StreakDay(date=today - timedelta(days=5), status="failed"),
    ]
    with session_factory() as db:
        db.add_all(rows)
        db.add(AppState(id=1, current_streak=3, longest_streak=4))
        db.commit()
    return today


def test_history_default_window(client, session_factory):
    seed(session_factory)
    response = client.get("/api/history")
    assert response.status_code == 200
    dates = [row["date"] for row in response.json()]
    assert len(dates) == 5
    assert dates == sorted(dates, reverse=True)


def test_history_days_param_filters(client, session_factory):
    today = seed(session_factory)
    response = client.get("/api/history?days=3")
    assert response.status_code == 200
    dates = {row["date"] for row in response.json()}
    assert dates == {
        (today - timedelta(days=1)).isoformat(),
        (today - timedelta(days=2)).isoformat(),
    }


def test_history_days_param_bounds(client):
    assert client.get("/api/history?days=0").status_code == 422
    assert client.get("/api/history?days=366").status_code == 422
    assert client.get("/api/history?days=365").status_code == 200
    assert client.get("/api/history?days=1").status_code == 200


def test_stats_math(client, session_factory):
    seed(session_factory)
    response = client.get("/api/stats")
    assert response.status_code == 200
    body = response.json()
    assert body["total_submitted_days"] == 3
    assert body["total_failed_days"] == 2
    assert body["completion_rate"] == 0.6
    assert body["total_minutes_logged"] == 270
    assert body["total_hours_logged"] == 4.5
    assert body["current_streak"] == 3
    assert body["longest_streak"] == 4


def test_stats_empty_db(client):
    response = client.get("/api/stats")
    assert response.status_code == 200
    body = response.json()
    assert body["total_submitted_days"] == 0
    assert body["total_failed_days"] == 0
    assert body["completion_rate"] == 0.0
    assert body["total_minutes_logged"] == 0
    assert body["total_hours_logged"] == 0.0
