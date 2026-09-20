"""P1.2: Create. One inference call, stored on the post; a card under my own ask."""

import pytest
from fastapi.testclient import TestClient

import store
from ai import client as ai_client
from main import app
from seed.roster import DEMO_USER

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    monkeypatch.delenv("MODEL_API_KEY", raising=False)
    store.reset()
    body = {k: v for k, v in DEMO_USER.items() if k not in ("id", "builder_title")}
    client.post("/profile", json=body)
    yield
    store.reset()


def test_post_appears_at_top_with_keyword_inference_when_model_is_absent():
    r = client.post("/posts", json={"type": "looking_for", "text": "looking for a backend person for a campus events app"}).json()
    post = r["post"]
    assert post["author"]["name"] == DEMO_USER["name"]
    assert post["inferred"]["needs"] == ["Backend"]
    assert post["inferred"]["area"] == "civic"
    assert post["inferred"]["commitment"] == "side_project"
    items = client.get("/feed").json()["items"]
    assert items[0]["id"] == post["id"]
    card = items[1]
    assert card["kind"] == "suggestion" and card["post_id"] == post["id"]
    assert card["profile"]["id"] == "p_amara"
    assert card["reason"].startswith("Amara brings Backend, the thing you just asked for.")
    assert r["suggestion"]["profile"]["id"] == "p_amara"


def test_model_inference_is_used_when_available(monkeypatch):
    monkeypatch.setenv("MODEL_API_KEY", "not-a-real-key")
    seen = {}

    def fake(system, messages, **_k):
        seen["user"] = messages[0]["content"]
        return '{"area": "accessibility", "needs": ["Mobile (iOS)", "Nonsense"], "platform": "ios", "commitment": "hackathon"}'

    monkeypatch.setattr(ai_client, "complete", fake)
    r = client.post("/posts", json={"type": "looking_for", "text": "need an iphone dev this weekend for the glove"}).json()
    assert "need an iphone dev" in seen["user"]
    assert r["post"]["inferred"] == {"area": "accessibility", "needs": ["Mobile (iOS)"], "platform": "ios", "commitment": "hackathon"}


def test_model_failure_falls_back_and_never_500s(monkeypatch):
    monkeypatch.setenv("MODEL_API_KEY", "not-a-real-key")
    monkeypatch.setattr(ai_client, "complete", lambda *a, **k: (_ for _ in ()).throw(ai_client.CallFailed("x")))
    r = client.post("/posts", json={"type": "update", "text": "shipped the block page. it is ugly and it works."})
    assert r.status_code == 200
    assert r.json()["post"]["inferred"]["needs"] == []
    assert r.json()["suggestion"] is None


def test_ordinary_posts_get_no_card_and_empty_posts_are_rejected():
    assert client.post("/posts", json={"type": "update", "text": "   "}).status_code == 400
    r = client.post("/posts", json={"type": "question", "text": "does anyone else's city api lie"}).json()
    assert r["suggestion"] is None
    items = client.get("/feed").json()["items"]
    assert items[0]["id"] == r["post"]["id"] and items[1]["kind"] == "post"


def test_reset_removes_my_posts():
    client.post("/posts", json={"type": "update", "text": "hello"})
    client.post("/reset")
    assert all(i["author_id"] != "me" for i in client.get("/feed").json()["items"] if i["kind"] == "post")
