from datetime import datetime, timedelta

from models import Challenge, ChallengeEntry
from timeutils import today_local_date


def _create(client, **overrides):
    body = {"title": "Learn Rust", "end_date": (today_local_date() + timedelta(days=7)).isoformat()}
    body.update(overrides)
    return client.post("/api/challenges", json=body)


def test_create_defaults_start_to_today(client):
    response = _create(client)
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Learn Rust"
    assert body["start_date"] == today_local_date().isoformat()
    assert body["status"] == "active"
    assert body["entry_count"] == 0
    assert body["is_overdue"] is False
    assert body["days_remaining"] == 7


def test_create_end_before_start_rejected(client):
    today = today_local_date()
    response = _create(
        client,
        start_date=today.isoformat(),
        end_date=(today - timedelta(days=1)).isoformat(),
    )
    assert response.status_code == 422


def test_create_requires_end_date(client):
    assert client.post("/api/challenges", json={"title": "No end"}).status_code == 422


def test_list_and_status_filter(client):
    a = _create(client, title="A").json()
    _create(client, title="B")
    client.patch(f"/api/challenges/{a['id']}", json={"status": "completed"})

    all_rows = client.get("/api/challenges").json()
    assert len(all_rows) == 2

    active = client.get("/api/challenges?status=active").json()
    assert [c["title"] for c in active] == ["B"]

    completed = client.get("/api/challenges?status=completed").json()
    assert [c["title"] for c in completed] == ["A"]


def test_get_detail_with_entries_and_404(client):
    cid = _create(client).json()["id"]
    client.post(f"/api/challenges/{cid}/entries", json={"note": "read ch.1", "duration_minutes": 40})

    detail = client.get(f"/api/challenges/{cid}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["entry_count"] == 1
    assert len(body["entries"]) == 1
    assert body["entries"][0]["note"] == "read ch.1"
    assert body["entries"][0]["duration_minutes"] == 40

    assert client.get("/api/challenges/99999").status_code == 404


def test_patch_edits_and_status_transitions(client):
    cid = _create(client).json()["id"]
    new_end = (today_local_date() + timedelta(days=30)).isoformat()

    edited = client.patch(
        f"/api/challenges/{cid}",
        json={"title": "Learn Rust deeply", "end_date": new_end},
    ).json()
    assert edited["title"] == "Learn Rust deeply"
    assert edited["end_date"] == new_end

    completed = client.patch(f"/api/challenges/{cid}", json={"status": "completed"}).json()
    assert completed["status"] == "completed"
    assert completed["completed_at"] is not None

    reopened = client.patch(f"/api/challenges/{cid}", json={"status": "active"}).json()
    assert reopened["status"] == "active"
    assert reopened["completed_at"] is None


def test_patch_end_before_start_rejected(client):
    cid = _create(client).json()["id"]
    past = (today_local_date() - timedelta(days=3)).isoformat()
    assert client.patch(f"/api/challenges/{cid}", json={"end_date": past}).status_code == 422


def test_entry_validation_and_delete(client):
    cid = _create(client).json()["id"]
    assert (
        client.post(f"/api/challenges/{cid}/entries", json={"note": "x", "duration_minutes": 0}).status_code
        == 422
    )
    assert client.post(f"/api/challenges/{cid}/entries", json={"note": ""}).status_code == 422

    entry_id = client.post(f"/api/challenges/{cid}/entries", json={"note": "did work"}).json()["id"]
    assert client.delete(f"/api/challenges/{cid}/entries/{entry_id}").status_code == 204
    assert client.get(f"/api/challenges/{cid}").json()["entry_count"] == 0

    # deleting an entry not under this challenge → 404
    other = _create(client, title="Other").json()["id"]
    stray = client.post(f"/api/challenges/{cid}/entries", json={"note": "z"}).json()["id"]
    assert client.delete(f"/api/challenges/{other}/entries/{stray}").status_code == 404


def test_delete_challenge_cascades_entries(client, session_factory):
    cid = _create(client).json()["id"]
    client.post(f"/api/challenges/{cid}/entries", json={"note": "one"})
    client.post(f"/api/challenges/{cid}/entries", json={"note": "two"})

    assert client.delete(f"/api/challenges/{cid}").status_code == 204
    assert client.get(f"/api/challenges/{cid}").status_code == 404

    with session_factory() as db:
        assert db.query(Challenge).count() == 0
        assert db.query(ChallengeEntry).count() == 0


def test_overdue_and_days_remaining(client, session_factory):
    today = today_local_date()
    with session_factory() as db:
        db.add(
            Challenge(
                title="Past due",
                start_date=today - timedelta(days=10),
                end_date=today - timedelta(days=2),
                status="active",
            )
        )
        db.commit()

    row = client.get("/api/challenges").json()[0]
    assert row["is_overdue"] is True
    assert row["days_remaining"] == -2

    # a completed challenge past its end date is not "overdue"
    cid = row["id"]
    done = client.patch(f"/api/challenges/{cid}", json={"status": "completed"}).json()
    assert done["is_overdue"] is False


def test_daily_checkin_flag_defaults_false_and_toggles(client):
    created = _create(client).json()
    assert created["requires_daily_checkin"] is False
    assert created["current_streak"] == 0
    assert created["best_streak"] == 0

    daily = _create(client, title="Meditate", requires_daily_checkin=True).json()
    assert daily["requires_daily_checkin"] is True

    toggled = client.patch(
        f"/api/challenges/{created['id']}", json={"requires_daily_checkin": True}
    ).json()
    assert toggled["requires_daily_checkin"] is True


def test_per_challenge_streak_computed_from_entries(client, session_factory):
    today = today_local_date()
    with session_factory() as db:
        challenge = Challenge(
            title="Meditate",
            start_date=today - timedelta(days=10),
            end_date=today + timedelta(days=10),
            status="active",
            requires_daily_checkin=True,
        )
        db.add(challenge)
        db.flush()
        # entries today, yesterday, 2 days ago (3-day run), plus a gap then day 5/6
        for offset in (0, 1, 2, 5, 6):
            db.add(
                ChallengeEntry(
                    challenge_id=challenge.id,
                    note=f"day-{offset}",
                    logged_at=datetime.combine(today - timedelta(days=offset), datetime.min.time()),
                )
            )
        db.commit()
        cid = challenge.id

    row = client.get(f"/api/challenges/{cid}").json()
    assert row["current_streak"] == 3  # today, -1, -2
    assert row["best_streak"] == 3
    assert row["entry_count"] == 5

    # turning the flag off zeroes the displayed streak
    off = client.patch(f"/api/challenges/{cid}", json={"requires_daily_checkin": False}).json()
    assert off["current_streak"] == 0
    assert off["best_streak"] == 0
