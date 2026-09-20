"""Demo fill is Donny: own posts and project appear only for that profile; reasons are seeded."""

import pytest
from fastapi.testclient import TestClient

import store
from ai import fallbacks
from main import app
from seed.roster import DEMO_POSTS, DEMO_REASONS, DEMO_USER

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    monkeypatch.delenv("MODEL_API_KEY", raising=False)
    store.reset()
    yield
    store.reset()


def onboard(profile=DEMO_USER):
    body = {k: v for k, v in profile.items() if k not in ("id", "builder_title")}
    r = client.post("/profile", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def test_demo_fill_identity_is_supplied_not_generated():
    data = onboard()
    assert data["profile"]["name"] == "Donny" and data["profile"]["school"] == "MIT"
    assert data["profile"]["builder_title"] == DEMO_USER["builder_title"]
    assert {s["name"]: s["level"] for s in data["profile"]["skills"]} == {
        "Frontend": "expert", "Product design": "solid", "Product management": "solid", "Writing / Content": "learning",
    }


def test_demo_user_has_posts_and_a_project_only_while_active():
    onboard()
    me = client.get("/people/me").json()
    assert [p["id"] for p in me["posts"]] == [d["id"] for d in DEMO_POSTS]
    assert [pr["name"] for pr in me["projects"]] == ["Dining Rush"]
    assert me["projects"][0]["needs"] == ["Backend"] and me["projects"][0]["tags"] == ["campus", "realtime"]
    feed_ids = [i["id"] for i in client.get("/feed").json()["items"] if i["kind"] == "post"]
    assert "po_d1" in feed_ids and feed_ids.index("po_02") < 3

    # A different person onboarding sees none of it.
    client.post("/reset")
    onboard({**DEMO_USER, "name": "Someone Else", "want_to_build": "A tool for finding climbing partners."})
    other = client.get("/people/me").json()
    assert other["posts"] == [] and other["projects"] == []
    assert all(not i["id"].startswith("po_d") for i in client.get("/feed").json()["items"])
    assert client.get("/projects/proj_dining").status_code == 404


def test_reset_turns_the_demo_content_off():
    onboard()
    assert store.demo_active() is True
    client.post("/reset")
    assert store.demo_active() is False


def test_rail_reasons_are_the_written_ones_and_vary():
    onboard()
    people = {r["profile"]["id"]: r for r in client.get("/people").json()["people"]}
    assert people["p_amara"]["reason"] == fallbacks.AMARA_EXPLANATION
    for pid, text in DEMO_REASONS.items():
        assert people[pid]["reason"] == text
    top = [r["profile"]["id"] for r in client.get("/people").json()["people"][:4]]
    reasons = [people[pid]["reason"] for pid in top]
    assert len(set(reasons)) == len(reasons), "top rows must not repeat a template"
    assert top[0] == "p_amara"


def test_projects_list_includes_demo_project_only_when_active():
    names = [p["name"] for p in client.get("/projects").json()["projects"]]
    assert "Late Bus" in names and "Dining Rush" not in names
    onboard()
    names = [p["name"] for p in client.get("/projects").json()["projects"]]
    assert "Dining Rush" in names
