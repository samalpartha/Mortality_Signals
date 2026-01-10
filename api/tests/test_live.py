
import pytest
import httpx

# Live Backend URL
BASE_URL = "https://mortality-signals-api-108816008638.us-central1.run.app"

def test_live_global_stats():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        response = client.get("/api/data/global-stats")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "entity_count" in data
        assert "cause_count" in data
        assert data["total_deaths"] > 0

def test_live_entities():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        response = client.get("/api/data/entities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "entity" in data[0]

def test_live_causes():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        response = client.get("/api/data/causes")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0

def test_live_signals():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        response = client.get("/api/insights/signals")
        # Signals might be empty if not fully populated, but should return 200
        assert response.status_code == 200
        assert isinstance(response.json(), list)
