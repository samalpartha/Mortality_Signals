
import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_read_main(client):
    response = client.get("/api/data/global-stats")
    assert response.status_code == 200
    r = response.json()
    assert "entity_count" in r
    assert "cause_count" in r

def test_get_entities(client):
    response = client.get("/api/data/entities")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    if len(response.json()) > 0:
        assert "entity" in response.json()[0]
        assert "code" in response.json()[0]

def test_get_causes(client):
    response = client.get("/api/data/causes")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_global_trend(client):
    response = client.get("/api/data/global-trend")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    if len(response.json()) > 0:
        assert "year" in response.json()[0]
        assert "total_deaths" in response.json()[0]

def test_get_insights_signals(client):
    response = client.get("/api/insights/signals")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_invalid_endpoint(client):
    response = client.get("/api/invalid")
    assert response.status_code == 404
