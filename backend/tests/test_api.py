"""Walks the whole demo path through the API, in process."""

import os

import pytest
from fastapi.testclient import TestClient

import store
from ai import calls, client as ai_client
from main import NO_KEY_NOTE, app
from seed.roster import DEMO_USER

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    store.reset()
    yield
    store.reset()


def onboard():
    body = {k: v for k, v in DEMO_USER.items() if k not in ("id", "builder_title")}
    r = client.post("/profile", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def link_amara():
    r = client.post("/swipe", json={"other_id": "p_amara", "dir": "right"}).json()
    assert r["matched"] is True
    return r["match"]


def test_full_demo_path():
    data = onboard()
    assert data["profile"]["builder_title"]
    stack = data["stack"]
    assert len(stack) == 26
    assert "p_amara" in [row["profile"]["id"] for row in stack[:3]]

    match = link_amara()
    assert match["explanation"]
    assert [i["name"] for i in match["ideas"]] == ["Block Board", "Late Bus", "City Hall API"]
    assert any(i["difficulty"] == "weekend" for i in match["ideas"])
    assert len(match["skill_bars"]) >= 3
    assert any(b["fills_my_gap"] for b in match["skill_bars"])
    assert "Frontend" in match["you_bring"]

    mid = match["id"]
    m = client.post(f"/match/{mid}/idea", json={"index": 0}).json()
    assert m["chosen_idea"] == 0
    assert len(m["mission"]["steps"]) == 3
    assert m["mission"]["done"] == [False, False, False]

    m = client.post(f"/match/{mid}/mission/toggle", json={"step": 0}).json()
    assert m["mission"]["done"] == [True, False, False]

    assert len(client.get("/matches").json()["matches"]) == 1


def test_chat_without_a_key_is_a_system_note_not_a_canned_teammate():
    onboard()
    mid = link_amara()["id"]
    r = client.post(f"/match/{mid}/chat", json={"text": "hey"}).json()
    assert r["status"] == "no_key"
    chat = r["match"]["chat"]
    assert [m["from"] for m in chat] == ["me", "system"]
    assert chat[1]["text"] == NO_KEY_NOTE
    assert "ok I'm in" not in chat[1]["text"]
    assert r["match"]["pending_reply"] is False


def test_failed_call_keeps_the_message_and_allows_retry(monkeypatch):
    onboard()
    mid = link_amara()["id"]
    client.post(f"/match/{mid}/idea", json={"index": 0})

    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-not-real")

    def boom(*_a, **_k):
        raise ai_client.CallFailed("nope")

    monkeypatch.setattr(ai_client, "complete", boom)
    r = client.post(f"/match/{mid}/chat", json={"text": "hey"}).json()
    assert r["status"] == "error"
    assert "sk-ant" not in r["error"]
    assert [m["from"] for m in r["match"]["chat"]] == ["me"]
    assert r["match"]["pending_reply"] is True

    # Refresh: the message is still there, still waiting.
    assert client.get(f"/match/{mid}").json()["pending_reply"] is True

    # Retry succeeds once the provider answers, and nothing is duplicated.
    captured = {}

    def fake_complete(system, messages, **_k):
        captured["system"] = system
        captured["user"] = messages[0]["content"]
        return '"Amara: hey! glad we matched lol. wanna pick what Block Board does first?"'

    monkeypatch.setattr(ai_client, "complete", fake_complete)
    r = client.post(f"/match/{mid}/chat/retry").json()
    assert r["status"] == "ok"
    chat = r["match"]["chat"]
    assert [m["from"] for m in chat] == ["me", "them"]
    assert chat[1]["text"] == "hey! glad we matched lol. wanna pick what Block Board does first?"

    # Full context went with the request.
    for needle in ("Amara Boateng", "Alex Chen", "Block Board", "First 30 minutes",
                   "step 1 not done", "USER: hey", "<why_you_matched>"):
        assert needle in captured["system"] + captured["user"], needle

    assert client.post(f"/match/{mid}/chat/retry").status_code == 400


def test_empty_reply_is_retried_then_fails_cleanly(monkeypatch):
    onboard()
    mid = link_amara()["id"]
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-not-real")
    calls_made = []

    def empty(*_a, **_k):
        calls_made.append(1)
        return '""'

    monkeypatch.setattr(ai_client, "complete", empty)
    r = client.post(f"/match/{mid}/chat", json={"text": "hey"}).json()
    assert r["status"] == "error"
    assert len(calls_made) == 2


def test_stack_before_onboarding_is_a_clean_404():
    assert client.get("/stack").status_code == 404


def test_swiping_the_same_person_twice_reuses_the_match():
    onboard()
    a = link_amara()
    b = link_amara()
    assert a["id"] == b["id"]
    assert len(client.get("/matches").json()["matches"]) == 1


def test_reset_keeps_seeds_and_drops_me():
    onboard()
    link_amara()
    client.post("/reset")
    assert client.get("/matches").json()["matches"] == []
    assert client.get("/profiles/me").status_code == 404
    assert client.get("/profiles/p_amara").status_code == 200


def test_bad_input_does_not_500():
    onboard()
    assert client.post("/swipe", json={"other_id": "nobody", "dir": "right"}).status_code == 404
    assert client.get("/match/m_999").status_code == 404
    assert client.post("/match/m_999/idea", json={"index": 0}).status_code == 404
    assert client.post("/match/m_999/chat/retry").status_code == 404


def test_key_is_never_in_a_response(monkeypatch):
    onboard()
    mid = link_amara()["id"]
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-SECRET-VALUE")
    monkeypatch.setattr(ai_client, "complete", lambda *a, **k: (_ for _ in ()).throw(ai_client.CallFailed("x")))
    r = client.post(f"/match/{mid}/chat", json={"text": "hey"})
    assert "SECRET" not in r.text
