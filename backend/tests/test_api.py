"""Walks the whole demo path through the API, in process."""

import pytest
from fastapi.testclient import TestClient

import store
from main import app
from seed.roster import ALEX

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean():
    store.reset()
    yield
    store.reset()


def onboard():
    body = {k: v for k, v in ALEX.items() if k not in ("id", "builder_title")}
    r = client.post("/profile", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def test_full_demo_path():
    data = onboard()
    assert data["profile"]["builder_title"]
    stack = data["stack"]
    assert len(stack) == 26
    assert stack[2]["profile"]["id"] == "p_maya"

    # Pass on the first two.
    for row in stack[:2]:
        assert client.post("/swipe", json={"other_id": row["profile"]["id"], "dir": "left"}).json() == {
            "matched": False
        }

    r = client.post("/swipe", json={"other_id": "p_maya", "dir": "right"}).json()
    assert r["matched"] is True
    match = r["match"]
    assert match["explanation"]
    assert len(match["ideas"]) == 3
    assert any(i["difficulty"] == "weekend" for i in match["ideas"])
    assert len(match["skill_bars"]) == 5
    assert any(b["fills_my_gap"] for b in match["skill_bars"])

    mid = match["id"]
    weekend = next(i for i, x in enumerate(match["ideas"]) if x["difficulty"] == "weekend")
    m = client.post(f"/match/{mid}/idea", json={"index": weekend}).json()
    assert m["chosen_idea"] == weekend
    assert len(m["mission"]["steps"]) == 3
    assert m["mission"]["done"] == [False, False, False]

    m = client.post(f"/match/{mid}/mission/toggle", json={"step": 0}).json()
    assert m["mission"]["done"] == [True, False, False]

    m = client.post(f"/match/{mid}/chat", json={"text": "want to build the loop thing?"}).json()
    assert len(m["chat"]) == 2
    assert m["chat"][0]["from"] == "me"
    assert m["chat"][1]["from"] == "them"
    assert m["chat"][1]["text"]

    assert len(client.get("/matches").json()["matches"]) == 1


def test_stack_before_onboarding_is_a_clean_404():
    assert client.get("/stack").status_code == 404


def test_swiping_the_same_person_twice_reuses_the_match():
    onboard()
    a = client.post("/swipe", json={"other_id": "p_maya", "dir": "right"}).json()["match"]
    b = client.post("/swipe", json={"other_id": "p_maya", "dir": "right"}).json()["match"]
    assert a["id"] == b["id"]
    assert len(client.get("/matches").json()["matches"]) == 1


def test_reset_keeps_seeds_and_drops_me():
    onboard()
    client.post("/swipe", json={"other_id": "p_maya", "dir": "right"})
    client.post("/reset")
    assert client.get("/matches").json()["matches"] == []
    assert client.get("/profiles/me").status_code == 404
    assert client.get("/profiles/p_maya").status_code == 200


def test_bad_input_does_not_500():
    onboard()
    assert client.post("/swipe", json={"other_id": "nobody", "dir": "right"}).status_code == 404
    assert client.get("/match/m_999").status_code == 404
    assert client.post("/match/m_999/idea", json={"index": 0}).status_code == 404
