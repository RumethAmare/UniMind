from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import app

ORIGIN = "http://localhost:3000"


def test_app_is_a_fastapi_instance():
    assert isinstance(app, FastAPI)


def test_health_and_docs_are_served_through_mount():
    client = TestClient(app)
    assert client.get("/api/v1/health").json() == {"status": "ok"}
    assert client.get("/docs").status_code == 200


def test_cors_headers_are_applied_to_error_responses():
    response = TestClient(app).get("/api/v1/auth/me", headers={"Origin": ORIGIN})
    assert response.status_code == 401
    assert response.headers["access-control-allow-origin"] == ORIGIN
