import copy
import pytest
from fastapi.testclient import TestClient

from src.app import app, activities, reset_activities

client = TestClient(app)

# store a deep copy of the initial state so we can reference it in assertions
_INITIAL = copy.deepcopy(activities)


@pytest.fixture(autouse=True)
def reset_activities_fixture():
    """Ensure each test starts with a fresh copy of the original activities."""
    # ARRANGE: restore the global state before each test
    reset_activities()
    yield


def test_root_redirects():
    # ACT: tell the client not to follow redirects so we can inspect headers
    resp = client.get("/", follow_redirects=False)

    # ASSERT
    assert resp.status_code in (200, 307)
    # FastAPI's RedirectResponse returns 307 by default
    assert resp.headers.get("location") == "/static/index.html"


def test_get_activities():
    # ACT
    resp = client.get("/activities")

    # ASSERT
    assert resp.status_code == 200
    assert resp.json() == _INITIAL


def test_signup_success():
    activity = list(_INITIAL.keys())[0]
    email = "new@mergington.edu"

    # ACT
    # encode the activity name to ensure spaces are handled properly
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})

    # ASSERT
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")
    assert email in activities[activity]["participants"]


def test_signup_nonexistent():
    # ACT
    resp = client.post("/activities/NoSuchActivity/signup", params={"email": "x@x.com"})

    # ASSERT
    assert resp.status_code == 404


def test_signup_duplicate():
    activity = list(_INITIAL.keys())[0]
    existing = _INITIAL[activity]["participants"][0]

    # ACT
    resp1 = client.post(f"/activities/{activity}/signup", params={"email": existing})
    resp2 = client.post(f"/activities/{activity}/signup", params={"email": existing})

    # ASSERT
    assert resp1.status_code == 400 or resp1.status_code == 409
    assert resp2.status_code == 400


def test_unregister_success():
    activity = list(_INITIAL.keys())[0]
    email = _INITIAL[activity]["participants"][0]

    # ACT
    resp = client.post(f"/activities/{activity}/unregister", params={"email": email})

    # ASSERT
    assert resp.status_code == 200
    assert email not in activities[activity]["participants"]


def test_unregister_nonexistent_activity():
    # ACT
    resp = client.post("/activities/NoSuch/unregister", params={"email": "a@b.com"})

    # ASSERT
    assert resp.status_code == 404


def test_unregister_not_registered():
    activity = list(_INITIAL.keys())[0]
    # pick an email that wasn't there
    email = "not@here.edu"

    # ACT
    resp = client.post(f"/activities/{activity}/unregister", params={"email": email})

    # ASSERT
    assert resp.status_code == 400
