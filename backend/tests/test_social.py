"""The social layer: feed, profiles, threads, connect, reset."""

import pytest
from fastapi.testclient import TestClient

import store
from main import app
from seed.roster import DEMO_USER, ROSTER

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    monkeypatch.delenv("MODEL_API_KEY", raising=False)
    store.reset()
    yield
    store.reset()


def onboard():
    body = {k: v for k, v in DEMO_USER.items() if k not in ("id", "builder_title")}
    assert client.post("/profile", json=body).status_code == 200


def test_feed_without_a_profile_is_just_posts():
    items = client.get("/feed").json()["items"]
    assert len(items) >= 20
    assert all(i["kind"] == "post" for i in items)
    assert all(i["author"]["name"] for i in items)


def test_amara_post_is_in_first_three_with_a_grounded_card_under_it():
    onboard()
    items = client.get("/feed").json()["items"]
    posts = [i for i in items if i["kind"] == "post"]
    idx = next(i for i, p in enumerate(posts) if p["id"] == "po_02")
    assert idx < 3
    assert posts[idx]["text"] == "looking for someone who actually enjoys frontend because I absolutely do not."
    pos = items.index(posts[idx])
    card = items[pos + 1]
    assert card["kind"] == "suggestion" and card["profile"]["id"] == "p_amara"
    assert card["post_id"] == "po_02"
    assert card["reason"] == (
        "Amara wants frontend help for a civic-tech project. "
        "You specialize in frontend, and you both care about tools for cities."
    )
    assert card["fit_label"] == "Strong complement"


def test_suggestion_cards_are_rare_and_never_a_model_call(monkeypatch):
    from ai import client as ai_client

    def boom(*_a, **_k):
        raise AssertionError("Home must never call the model")

    monkeypatch.setattr(ai_client, "complete", boom)
    onboard()
    items = client.get("/feed").json()["items"]
    cards = [i for i in items if i["kind"] == "suggestion"]
    assert 1 <= len(cards) <= 3
    # at most one card per ~6 posts
    positions = [i for i, it in enumerate(items) if it["kind"] == "suggestion"]
    assert all(b - a >= 6 for a, b in zip(positions, positions[1:]))


def test_every_seed_profile_page_loads_and_me_too():
    onboard()
    for p in ROSTER:
        r = client.get(f"/people/{p['id']}").json()
        assert r["profile"]["id"] == p["id"]
        assert r["fit"] is not None and r["fit"]["reason"]
    me = client.get("/people/me").json()
    assert me["is_me"] and me["fit"] is None


def test_amara_profile_shows_late_bus_and_her_posts():
    onboard()
    r = client.get("/people/p_amara").json()
    assert [pr["name"] for pr in r["projects"]] == ["Late Bus"]
    assert len(r["posts"]) == 3
    assert r["fit"]["fit_label"] == "Strong complement"
    assert r["connected"] is False and r["match_id"] is None


def test_connect_from_profile_creates_match_and_thread():
    onboard()
    r = client.post("/connect", json={"other_id": "p_amara"}).json()
    assert r["matched"] and r["match"]["other"]["id"] == "p_amara"
    mid = r["match"]["id"]
    page = client.get("/people/p_amara").json()
    assert page["connected"] is True and page["match_id"] == mid
    threads = client.get("/threads").json()["threads"]
    assert threads[0]["id"] == mid and threads[0]["read_only"] is False
    assert [t["kind"] for t in threads[1:]] == ["seed", "seed"]
    assert client.get("/threads/t_leo").json()["read_only"] is True
    people = client.get("/people").json()["people"]
    assert next(p for p in people if p["profile"]["id"] == "p_amara")["connected"] is True


def test_project_page():
    r = client.get("/projects/proj_latebus").json()
    assert r["name"] == "Late Bus" and r["team"][0]["id"] == "p_amara"
    assert len(r["update_posts"]) == 3
    assert client.get("/projects/nope").status_code == 404


def test_reset_clears_connections_and_keeps_seeds():
    onboard()
    client.post("/connect", json={"other_id": "p_amara"})
    client.post("/reset")
    assert store.connections() == {}
    assert client.get("/threads").json()["threads"][0]["kind"] == "seed"
    assert len(client.get("/feed").json()["items"]) >= 20
