from scheduler import today_local_date


def test_streak_shape_and_new_fields(client):
    client.post("/api/goal", json={"title": "Train", "description": "Every day"})

    response = client.get("/api/streak")
    assert response.status_code == 200
    body = response.json()

    assert body["current_streak"] == 0
    assert body["longest_streak"] == 0
    assert body["today_status"] == "pending"
    assert body["goal_title"] == "Train"
    assert body["goal_description"] == "Every day"
    assert body["timezone"] == "Africa/Addis_Ababa"
    assert body["server_today"] == today_local_date().isoformat()


def test_streak_without_goal(client):
    response = client.get("/api/streak")
    assert response.status_code == 200
    body = response.json()
    assert body["goal_title"] is None
    assert body["goal_description"] is None


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
