"""P1.1: picking an idea creates a project; the project can name its missing piece."""

import pytest
from fastapi.testclient import TestClient

import store
from main import app
from seed.roster import DEMO_USER

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    monkeypatch.delenv("MODEL_API_KEY", raising=False)
    store.reset()
    yield
    store.reset()


def start_block_board():
    body = {k: v for k, v in DEMO_USER.items() if k not in ("id", "builder_title")}
    client.post("/profile", json=body)
    mid = client.post("/connect", json={"other_id": "p_amara"}).json()["match"]["id"]
    m = client.post(f"/match/{mid}/idea", json={"index": 0}).json()
    return mid, m


def test_choosing_block_board_creates_the_project():
    mid, m = start_block_board()
    pr = client.get(f"/projects/proj_{mid}").json()
    assert pr["name"] == "Block Board"
    assert [t["id"] for t in pr["team"]] == ["me", "p_amara"]
    assert {"Frontend", "Backend", "Data"} <= set(pr["has"])
    assert pr["needs"] == ["Product design", "Community"]
    assert "Product design" not in pr["has"]
    assert m["ideas"][0]["needs"] == ["Product design", "Community"]


def test_block_boards_missing_piece_is_sarah_for_grounded_reasons():
    mid, _ = start_block_board()
    r = client.get(f"/projects/proj_{mid}/missing-piece").json()
    print("\nBlock Board missing piece, top 3:")
    for row in r["ranked"][:3]:
        print("  %-16s score=%3d covers=%s" % (row["name"], row["score"], row["covers"]))
    top = r["candidate"]
    assert top["profile"]["id"] == "p_sarah"
    assert set(top["covers"]) == {"Product design", "Community"}
    assert top["reason"].startswith("Sarah brings Product design and Community, the two things Block Board is missing.")
    assert "neighbors" in top["reason"]
    assert top["connected"] is False


def test_team_members_are_never_their_own_missing_piece():
    mid, _ = start_block_board()
    ids = [row["id"] for row in client.get(f"/projects/proj_{mid}/missing-piece").json()["ranked"]]
    assert "p_amara" not in ids and "me" not in ids


def test_reset_removes_the_created_project():
    mid, _ = start_block_board()
    client.post("/reset")
    assert client.get(f"/projects/proj_{mid}").status_code == 404
    assert client.get("/projects/proj_latebus").status_code == 200
