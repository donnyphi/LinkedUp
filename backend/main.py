import time
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import scoring
import store
from ai import calls, client as ai_client, fallbacks
from seed.roster import DEMO_USER
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
    rows = scoring.build_stack(me, others, ai_scores)
    # The per-pair "Why you two" when it has already been written (seeded for the
    # demo pairs, cached after a live call for anyone else); a grounded one-liner
    # otherwise. Never a model call here.
    cache = store.cache_all()
    fp_me = calls._profile_fingerprint(me)
    for r in rows:
        written = cache.get(calls._key("explain", fp_me, calls._profile_fingerprint(r["profile"])))
        r["reason"] = written if isinstance(written, str) and written.strip() else fallbacks.suggestion_reason(
            me, r["profile"], r["fills"], r["you_bring"]
        )
    return rows


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
    # Demo fill brings its own posts and project along; nobody else inherits them.
    store.set_demo_active(calls._profile_fingerprint(profile) == calls._profile_fingerprint(DEMO_USER))
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


def _connect(other_id: str) -> Dict:
    """Connecting is the old right-swipe: create the match (seeds always say yes)."""
    me = _me()
    other = store.get_profile(other_id)
    if not other:
        raise HTTPException(404, "No such profile")

    existing = next(
        (m for m in store.matches() if m["user_id"] == ME and m["other_id"] == other["id"]), None
    )
    if existing:
        store.set_connection(other["id"], "connected")
        return _match_view(existing)

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
    store.set_connection(other["id"], "connected")
    return _match_view(match)


@app.post("/swipe")
def swipe(body: SwipeIn):
    _me()
    if body.dir == "left":
        return {"matched": False}
    return {"matched": True, "match": _connect(body.other_id)}


class ConnectIn(BaseModel):
    other_id: str


class PostIn(BaseModel):
    type: str = "update"
    text: str


VALID_POST_TYPES = {"update", "looking_for", "build_log", "idea", "question", "ship"}


@app.post("/posts")
def create_post(body: PostIn):
    """Create. One model call infers area / needs / platform / commitment and it's stored on the post."""
    me = _me()
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Say something first")
    post_type = body.type if body.type in VALID_POST_TYPES else "update"
    row = {
        "id": store.next_post_id(),
        "author_id": ME,
        "type": post_type,
        "text": text[:600],
        "project_id": None,
        "created_at": time.time(),
        "likes": 0,
        "inferred": calls.infer_post(text, post_type),
    }
    store.add_user_post(row)
    post = _with_author(row)
    suggestion = _ask_suggestion(me, post)
    return {"post": {"kind": "post", **post}, "suggestion": suggestion}


def _ask_suggestion(me: Dict, post: Dict) -> Optional[Dict]:
    """Under my own 'looking for' post: the best-fit person who has what I asked for."""
    if post.get("type") != "looking_for":
        return None
    needs = (post.get("inferred") or {}).get("needs") or []
    if not needs:
        return None
    conns = store.connections()
    for row in _stack_rows(me):
        have = {s["name"] for s in row["profile"].get("skills") or []}
        covered = [n for n in needs if n in have]
        if covered and conns.get(row["profile"]["id"]) != "connected":
            return {
                "kind": "suggestion",
                "id": f"sg_{row['profile']['id']}_{post['id']}",
                "profile": row["profile"],
                "score": row["score"],
                "fit_label": row["fit_label"],
                "fills": row["fills"],
                "you_bring": row["you_bring"],
                "reason": fallbacks.ask_reason(me, row["profile"], covered, post["text"]),
                "post_id": post["id"],
                "connected": False,
            }
    return None


@app.post("/connect")
def connect(body: ConnectIn):
    return {"matched": True, "match": _connect(body.other_id)}


# --- social layer ------------------------------------------------------------


def _with_author(post: Dict) -> Dict:
    author = store.get_profile(post["author_id"]) or {}
    project = store.get_project(post["project_id"]) if post.get("project_id") else None
    return {
        **post,
        "author": {k: author.get(k) for k in ("id", "name", "school", "avatar", "builder_title")},
        "project": {"id": project["id"], "name": project["name"]} if project else None,
    }


def _suggestion(me: Dict, row: Dict, post: Optional[Dict] = None) -> Dict:
    other = row["profile"]
    return {
        "kind": "suggestion",
        "id": f"sg_{other['id']}_{post['id'] if post else 'general'}",
        "profile": other,
        "score": row["score"],
        "fit_label": row["fit_label"],
        "fills": row["fills"],
        "you_bring": row["you_bring"],
        "reason": fallbacks.suggestion_reason(me, other, row["fills"], row["you_bring"], post),
        "post_id": post["id"] if post else None,
        "connected": store.connections().get(other["id"]) == "connected",
    }


@app.get("/feed")
def feed():
    """Posts newest first with 'You two should know each other' cards between them.

    No model call here, ever. Suggestions come from the scored stack and a
    deterministic, field-grounded reason.
    """
    me = store.get_profile(ME)
    rows = [_with_author(p) for p in store.posts()]
    if not me:
        return {"items": [{"kind": "post", **p} for p in rows]}

    by_id = {r["profile"]["id"]: r for r in _stack_rows(me)}
    my_skills = {s["name"] for s in me.get("skills") or []}
    items, cooldown, used = [], 0, set()
    for i, post in enumerate(rows):
        items.append({"kind": "post", **post})
        cooldown = max(0, cooldown - 1)
        row = by_id.get(post["author_id"])
        needs = set(((post.get("inferred") or {}).get("needs") or []))
        anchored = (
            post["type"] == "looking_for"
            and row is not None
            and row["score"]["overall"] >= 70
            and bool(needs & my_skills)
            and post["author_id"] not in used
        )
        if anchored and cooldown == 0:
            items.append(_suggestion(me, row, post))
            used.add(post["author_id"])
            cooldown = 6
        elif post["author_id"] == ME and post["type"] == "looking_for":
            mine = _ask_suggestion(me, post)
            if mine and mine["profile"]["id"] not in used:
                items.append(mine)
                used.add(mine["profile"]["id"])
                cooldown = 6
        elif i == 7 and cooldown == 0:
            # One general card mid-feed: the best person not already shown.
            best = next((r for r in by_id.values() if r["profile"]["id"] not in used and r["score"]["overall"] >= 70), None)
            if best:
                items.append(_suggestion(me, best))
                used.add(best["profile"]["id"])
                cooldown = 6
    return {"items": items}


@app.get("/people")
def people():
    """Discover: the scored stack, plus whether you're already connected."""
    me = _me()
    conns = store.connections()
    return {"people": [{**r, "connected": conns.get(r["profile"]["id"]) == "connected"} for r in _stack_rows(me)]}


@app.get("/people/{pid}")
def person(pid: str):
    """A profile page: the person, their posts and projects, and how you two fit."""
    profile = store.get_profile(pid)
    if not profile:
        raise HTTPException(404, "No such profile")
    posts = [_with_author(p) for p in store.posts() if p["author_id"] == pid]
    projects = [pr for pr in store.projects() if pid in pr.get("team_ids", [])]
    out = {"profile": profile, "posts": posts, "projects": projects, "is_me": pid == ME,
           "connected": False, "match_id": None, "fit": None}
    me = store.get_profile(ME)
    if me and pid != ME:
        row = next((r for r in _stack_rows(me) if r["profile"]["id"] == pid), None)
        if row:
            out["fit"] = {
                "score": row["score"], "fit_label": row["fit_label"], "fills": row["fills"],
                "you_bring": row["you_bring"], "reason": row["reason"],
                "skill_bars": _skill_bars(me, profile),
            }
        out["connected"] = store.connections().get(pid) == "connected"
        m = next((m for m in store.matches() if m["other_id"] == pid), None)
        out["match_id"] = m["id"] if m else None
    return out


@app.get("/projects")
def projects_list():
    """Every project, seeded and started here, with a light team summary."""
    out = []
    for pr in store.projects():
        team = [store.get_profile(t) for t in pr.get("team_ids", [])]
        out.append({**pr, "team": [{k: t.get(k) for k in ("id", "name", "avatar")} for t in team if t]})
    return {"projects": out}


@app.get("/projects/{pid}")
def project(pid: str):
    pr = store.get_project(pid)
    if not pr:
        raise HTTPException(404, "No such project")
    team = [store.get_profile(t) for t in pr.get("team_ids", [])]
    updates = [_with_author(p) for p in store.posts() if p["id"] in set(pr.get("updates", []))]
    return {**pr, "team": [t for t in team if t], "update_posts": updates}


@app.get("/threads")
def threads():
    """Messages: real threads first (your matches), then seeded read-only ones for texture."""
    out = []
    for m in store.matches():
        other = store.get_profile(m["other_id"])
        if not other:
            continue
        last = m["chat"][-1] if m.get("chat") else None
        idea = m["ideas"][m["chosen_idea"]] if m.get("chosen_idea") is not None else None
        out.append({
            "id": m["id"], "kind": "match", "other": other, "read_only": False,
            "last": last, "project": idea["name"] if idea else None,
            "done": sum(1 for d in (m.get("mission") or {}).get("done", []) if d),
            "total": len((m.get("mission") or {}).get("steps", [])),
        })
    out.sort(key=lambda t: (t["last"] or {}).get("ts", 0), reverse=True)
    for t in store.threads():
        other = store.get_profile(t["other_id"])
        if other:
            out.append({"id": t["id"], "kind": "seed", "other": other, "read_only": True,
                        "last": t["chat"][-1], "project": None, "done": 0, "total": 0})
    return {"threads": out}


@app.get("/threads/{tid}")
def thread(tid: str):
    t = next((t for t in store.threads() if t["id"] == tid), None)
    if not t:
        raise HTTPException(404, "No such thread")
    return {**t, "other": store.get_profile(t["other_id"])}


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
    me, other = _me(), store.get_profile(m["other_id"])
    steps = calls.first_mission(me, other, idea)["steps"]
    m["mission"] = {"steps": steps, "done": [False] * len(steps)}
    store.upsert_match(m)
    store.upsert_user_project(_project_from_idea(m, idea, me, other))
    return _match_view(m)


def _project_from_idea(m: Dict, idea: Dict, me: Dict, other: Dict) -> Dict:
    """Picking an idea makes it a project. Has = what the pair holds; needs = what the idea declared."""
    needs = list(idea.get("needs") or [])
    has = []
    for p in (me, other):
        for s in p.get("skills") or []:
            if s.get("level", "solid") != "learning" and s["name"] not in has and s["name"] not in needs:
                has.append(s["name"])
    return {
        "id": f"proj_{m['id']}",
        "name": idea["name"],
        "one_liner": idea.get("one_liner", ""),
        "team_ids": [ME, other["id"]],
        "has": has,
        "needs": needs,
        "stage": "starting",
        "updates": [],
        "match_id": m["id"],
    }


@app.get("/projects/{pid}/missing-piece")
def missing_piece(pid: str):
    """Who fills what this project still needs. Deterministic, from the same scoring."""
    pr = store.get_project(pid)
    if not pr:
        raise HTTPException(404, "No such project")
    ranked = fallbacks.missing_piece(pr, [p for p in store.profiles() if p["id"] != ME])
    if not ranked:
        return {"candidate": None, "ranked": []}
    top = ranked[0]
    conns = store.connections()
    return {
        "candidate": {
            "profile": top["profile"], "score": top["score"], "covers": top["covers"],
            "reason": fallbacks.missing_piece_reason(pr, top),
            "connected": conns.get(top["profile"]["id"]) == "connected",
        },
        "ranked": [{"id": r["profile"]["id"], "name": r["profile"]["name"], "score": r["score"], "covers": r["covers"]} for r in ranked[:5]],
    }


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


NO_KEY_NOTE = "LinkedUp chat needs MODEL_API_KEY set on the backend. Add it to backend/.env and restart uvicorn."


def _reply(m: Dict) -> Dict:
    """Ask the model for the teammate's next line. Returns the chat response envelope."""
    other = store.get_profile(m["other_id"])
    try:
        text = calls.teammate_reply(_me(), other, m)
    except ai_client.NoKey:
        m["chat"].append({"from": "system", "text": NO_KEY_NOTE, "ts": time.time()})
        store.upsert_match(m)
        return {"status": "no_key", "match": _match_view(m)}
    except ai_client.CallFailed:
        store.upsert_match(m)
        return {"status": "error", "match": _match_view(m), "error": "Couldn't reach the model. Your message is saved."}
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
