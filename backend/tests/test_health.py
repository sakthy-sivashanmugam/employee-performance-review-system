import pytest
from fastapi.testclient import TestClient

from app import database
from app.main import app

client = TestClient(app)


@pytest.fixture
def no_cached_engine():
    """Keep the cached engine from leaking between tests."""
    database.get_engine.cache_clear()
    yield
    database.get_engine.cache_clear()


def test_health_returns_ok():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_is_only_served_under_api_prefix():
    assert client.get("/health").status_code == 404


def test_health_does_not_touch_the_database(monkeypatch):
    def fail(*args, **kwargs):
        raise AssertionError("health check must not use the database")

    monkeypatch.setattr(database, "get_engine", fail)

    assert client.get("/api/health").status_code == 200


def test_get_engine_requires_database_url(monkeypatch, no_cached_engine):
    monkeypatch.delenv("DATABASE_URL", raising=False)

    with pytest.raises(RuntimeError, match="DATABASE_URL is not set"):
        database.get_engine()
