import time
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import scoring
import store
from ai import calls, client as ai_client
from models import (
    ChatIn,
    IdeaIn,
    Profile,
    ProfileIn,
    SwipeIn,
    ToggleIn,
)
from taxonomy import AVATARS, COMMITMENTS, EXPERIENCES, LEVELS, SKILLS, TEAM_SIZES

app = FastAPI(title="LinkedUp")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ME = "me"
LEVEL_NUM = {"learning": 1, "solid": 2, "expert": 3}


# --- helpers ---------------------------------------------------------------


def _me() -> Dict:
    me = store.get_profile(ME)
    if not me:
        raise HTTPException(404, "No profile yet. Finish onboarding first.")
    return me


def _others() -> List[Dict]:
    return [p for p in store.profiles() if p["id"] != ME]


def _stack_rows(me: Dict) -> List[Dict]:
    others = _others()
    ai_scores = calls.score_pairs(me, others)
    return scoring.build_stack(me, others, ai_scores)


def _skill_bars(me: Dict, other: Dict) -> List[Dict]:
    mine = {s["name"]: LEVEL_NUM.get(s.get("level", "solid"), 2) for s in me.get("skills") or []}
    theirs = {s["name"]: LEVEL_NUM.get(s.get("level", "solid"), 2) for s in other.get("skills") or []}
    my_missing = set(me.get("missing") or [])
    their_missing = set(other.get("missing") or [])

    names: List[str] = []
    for n in sorted(my_missing & set(theirs), key=lambda n: -theirs[n]):
        names.append(n)
    for n in sorted(their_missing & set(mine), key=lambda n: -mine[n]):
        if n not in names:
            names.append(n)
    for n in sorted(set(mine) | set(theirs), key=lambda n: -(mine.get(n, 0) + theirs.get(n, 0))):
        if n not in names:
            names.append(n)

    return [
        {
            "name": n,
            "mine": mine.get(n, 0),
            "theirs": theirs.get(n, 0),
            "fills_my_gap": n in my_missing and n in theirs,
            "fills_their_gap": n in their_missing and n in mine,
        }
        for n in names[:5]
    ]


def _match_view(match: Dict) -> Dict:
    other = store.get_profile(match["other_id"])
    if not other:
        raise HTTPException(404, "That person is gone.")
    me = _me()
    _, fills = scoring.skills_score(me, other)
    chat = match.get("chat") or []
    return {
        **match,
        "other": other,
        "fills": fills,
        "you_bring": scoring.you_bring(me, other),
        "skill_bars": _skill_bars(me, other),
        "pending_reply": bool(chat) and chat[-1].get("from") == "me",
    }


# --- routes ----------------------------------------------------------------


@app.get("/health")
def health():
    from ai import client

    return {"ok": True, "model": client.MODEL, "live_ai": client.have_key()}


@app.get("/session")
def session():
    """Everything the app needs on load. Always 200, so a fresh visit is a quiet one."""
    me = store.get_profile(ME)
    if not me:
        return {"profile": None, "stack": []}
    return {"profile": me, "stack": _stack_rows(me)}


@app.get("/taxonomy")
def taxonomy():
    return {
        "skills": SKILLS,
        "levels": LEVELS,
        "commitments": COMMITMENTS,
        "experiences": EXPERIENCES,
        "team_sizes": TEAM_SIZES,
        "avatars": AVATARS,
    }


@app.post("/profile")
def post_profile(body: ProfileIn):
    profile = Profile(id=ME, **body.model_dump()).model_dump()
    profile["builder_title"] = calls.builder_title(profile)
    store.upsert_profile(profile)
    store.save_matches([])
    return {"profile": profile, "stack": _stack_rows(profile)}


@app.get("/stack")
def get_stack():
    return {"stack": _stack_rows(_me())}


@app.get("/profiles/{pid}")
def get_profile(pid: str):
    p = store.get_profile(pid)
    if not p:
        raise HTTPException(404, "No such profile")
    return p


@app.get("/why/{other_id}")
def why(other_id: str):
    """The 'Why us?' pill. Read-only on purpose - peeking is not swiping."""
    me = _me()
    other = store.get_profile(other_id)
    if not other:
        raise HTTPException(404, "No such profile")
    ai_scores = calls.score_pairs(me, _others())
    score, fills = scoring.score_one(me, other, ai_scores.get(other_id, {}))
    return {"explanation": calls.explain_match(me, other, score, fills), "score": score}


@app.post("/swipe")
def swipe(body: SwipeIn):
    me = _me()
    if body.dir == "left":
        return {"matched": False}

    other = store.get_profile(body.other_id)
    if not other:
        raise HTTPException(404, "No such profile")

    existing = next(
        (m for m in store.matches() if m["user_id"] == ME and m["other_id"] == other["id"]), None
    )
    if existing:
        return {"matched": True, "match": _match_view(existing)}

    ai_scores = calls.score_pairs(me, _others())
    score, fills = scoring.score_one(me, other, ai_scores.get(other["id"], {}))

    match = {
        "id": store.next_match_id(),
        "user_id": ME,
        "other_id": other["id"],
        "score": score,
        "explanation": calls.explain_match(me, other, score, fills),
        "ideas": calls.generate_ideas(me, other),
        "chosen_idea": None,
        "mission": None,
        "chat": [],
    }
    store.upsert_match(match)
    return {"matched": True, "match": _match_view(match)}


@app.get("/matches")
def get_matches():
    out = []
    for m in store.matches():
        other = store.get_profile(m["other_id"])
        if other:
            out.append({**m, "other": other})
    out.sort(key=lambda m: m["score"]["overall"], reverse=True)
    return {"matches": out}


@app.get("/match/{mid}")
def get_match(mid: str):
    m = store.get_match(mid)
    if not m:
        raise HTTPException(404, "No such match")
    return _match_view(m)


@app.post("/match/{mid}/idea")
def choose_idea(mid: str, body: IdeaIn):
    m = store.get_match(mid)
    if not m:
        raise HTTPException(404, "No such match")
    if not 0 <= body.index < len(m["ideas"]):
        raise HTTPException(400, "No idea at that index")

    m["chosen_idea"] = body.index
    idea = m["ideas"][body.index]
    steps = calls.first_mission(_me(), store.get_profile(m["other_id"]), idea)["steps"]
    m["mission"] = {"steps": steps, "done": [False] * len(steps)}
    store.upsert_match(m)
    return _match_view(m)


@app.post("/match/{mid}/mission/toggle")
def toggle_step(mid: str, body: ToggleIn):
    m = store.get_match(mid)
    if not m or not m.get("mission"):
        raise HTTPException(404, "No mission yet")
    done = m["mission"]["done"]
    if not 0 <= body.step < len(done):
        raise HTTPException(400, "No step at that index")
    done[body.step] = not done[body.step]
    store.upsert_match(m)
    return _match_view(m)


NO_KEY_NOTE = "LinkedUp chat needs ANTHROPIC_API_KEY set on the backend. Add it and restart uvicorn."


def _reply(m: Dict) -> Dict:
    """Ask Claude for the teammate's next line. Returns the chat response envelope."""
    other = store.get_profile(m["other_id"])
    try:
        text = calls.teammate_reply(_me(), other, m)
    except ai_client.NoKey:
        m["chat"].append({"from": "system", "text": NO_KEY_NOTE, "ts": time.time()})
        store.upsert_match(m)
        return {"status": "no_key", "match": _match_view(m)}
    except ai_client.CallFailed:
        store.upsert_match(m)
        return {"status": "error", "match": _match_view(m), "error": "Couldn't reach Claude. Your message is saved."}
    m["chat"].append({"from": "them", "text": text, "ts": time.time()})
    store.upsert_match(m)
    return {"status": "ok", "match": _match_view(m)}


@app.post("/match/{mid}/chat")
def post_chat(mid: str, body: ChatIn):
    m = store.get_match(mid)
    if not m:
        raise HTTPException(404, "No such match")
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Empty message")
    m["chat"].append({"from": "me", "text": text, "ts": time.time()})
    store.upsert_match(m)  # the user's words are kept whatever happens next
    return _reply(m)


@app.post("/match/{mid}/chat/retry")
def retry_chat(mid: str):
    """Try again for the last unanswered message. Never appends a second copy of it."""
    m = store.get_match(mid)
    if not m:
        raise HTTPException(404, "No such match")
    chat = m.get("chat") or []
    if not chat or chat[-1].get("from") != "me":
        raise HTTPException(400, "Nothing waiting for a reply")
    return _reply(m)


@app.post("/reset")
def reset():
    store.reset()
    return {"ok": True}
