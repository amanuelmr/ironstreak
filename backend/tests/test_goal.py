def test_get_goal_empty_db_returns_404(client):
    response = client.get("/api/goal")
    assert response.status_code == 404


def test_create_and_get_goal(client):
    response = client.post(
        "/api/goal",
        json={"title": "Ship the side project", "description": "One hour daily"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Ship the side project"
    assert body["description"] == "One hour daily"
    assert body["id"] > 0
    assert body["created_at"]

    fetched = client.get("/api/goal")
    assert fetched.status_code == 200
    assert fetched.json()["title"] == "Ship the side project"
    assert fetched.json()["description"] == "One hour daily"


def test_new_goal_deactivates_previous(client):
    client.post("/api/goal", json={"title": "First goal"})
    client.post("/api/goal", json={"title": "Second goal"})

    fetched = client.get("/api/goal")
    assert fetched.status_code == 200
    assert fetched.json()["title"] == "Second goal"


def test_create_goal_empty_title_rejected(client):
    response = client.post("/api/goal", json={"title": ""})
    assert response.status_code == 422
