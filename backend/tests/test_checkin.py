CHECKIN = {
    "proof_link": "https://example.com/proof",
    "proof_note": "did the work",
    "duration_minutes": 90,
}


def test_checkin_without_goal_rejected(client):
    response = client.post("/api/checkin", json=CHECKIN)
    assert response.status_code == 400


def test_checkin_happy_path(client):
    client.post("/api/goal", json={"title": "Train"})

    response = client.post("/api/checkin", json=CHECKIN)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "submitted"
    assert body["current_streak"] == 1
    assert body["longest_streak"] == 1
    assert body["duration_minutes"] == 90
    assert body["proof_link"] == "https://example.com/proof"
    assert body["submitted_at"]


def test_checkin_twice_same_day_conflicts(client):
    client.post("/api/goal", json={"title": "Train"})
    assert client.post("/api/checkin", json=CHECKIN).status_code == 200
    assert client.post("/api/checkin", json=CHECKIN).status_code == 409


def test_checkin_under_60_minutes_rejected(client):
    client.post("/api/goal", json={"title": "Train"})
    response = client.post("/api/checkin", json={**CHECKIN, "duration_minutes": 59})
    assert response.status_code == 422


def test_checkin_invalid_link_rejected(client):
    client.post("/api/goal", json={"title": "Train"})
    response = client.post("/api/checkin", json={**CHECKIN, "proof_link": "not-a-url"})
    assert response.status_code == 422


def test_today_checkin_transitions(client):
    client.post("/api/goal", json={"title": "Train"})

    before = client.get("/api/checkin/today")
    assert before.status_code == 200
    assert before.json()["status"] == "pending"

    client.post("/api/checkin", json=CHECKIN)

    after = client.get("/api/checkin/today")
    assert after.json()["status"] == "submitted"
    assert after.json()["duration_minutes"] == 90
