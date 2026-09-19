"""The six Claude calls. Each one is cache -> API -> fallback, in that order."""

import hashlib
import json
from typing import Dict, List

import store
from ai import client, fallbacks

BAN = "Never use these words: leverage, synergy, complement, dynamic, passionate, innovative."


def _key(kind: str, *parts) -> str:
    blob = json.dumps(parts, sort_keys=True, ensure_ascii=False, default=str)
    return f"{kind}:{hashlib.sha1(blob.encode()).hexdigest()[:16]}"


def _profile_fingerprint(p: Dict) -> Dict:
    """Only the fields an AI answer actually depends on."""
    return {
        "name": p.get("name"),
        "skills": sorted([(s["name"], s.get("level", "solid")) for s in p.get("skills") or []]),
        "missing": sorted(p.get("missing") or []),
        "want_to_build": p.get("want_to_build", ""),
        "commitment": p.get("commitment"),
        "experience": p.get("experience"),
        "prompts": p.get("prompts") or {},
    }


def _cached(key: str, live, fallback):
    hit = store.cache_get(key)
    if hit is not None:
        return hit
    try:
        value = live()
    except Exception:
        value = None
    if value is None:
        return fallback()
    store.cache_set(key, value)
    return value


def _skill_line(p: Dict) -> str:
    return ", ".join(f"{s['name']} ({s.get('level', 'solid')})" for s in p.get("skills") or [])


def _describe(p: Dict) -> str:
    pr = p.get("prompts") or {}
    return (
        f"{p.get('name')} ({p.get('school')})\n"
        f"skills: {_skill_line(p)}\n"
        f"missing: {', '.join(p.get('missing') or [])}\n"
        f"wants to build: {p.get('want_to_build')}\n"
        f"commitment: {p.get('commitment')} | experience: {p.get('experience')}\n"
        f"the hackathon person who...: {pr.get('hackathon_person', '')}\n"
        f"toxic trait: {pr.get('toxic_trait', '')}\n"
        f"irrationally excited about: {pr.get('excited_about', '')}"
    )


# --- A ---------------------------------------------------------------------

SCORE_SYSTEM = (
    "You are scoring builder compatibility. For each candidate, rate 0-100 on two axes. "
    "passion = how much their 'wants to build' overlaps IN SPIRIT with the user's. Judge "
    "meaning, not keywords: 'tools for musicians' and 'helping bedroom producers finish songs' "
    "is a 90. Unrelated domains are under 35. "
    "style = how compatible their working styles look from the three prompt answers. Similar "
    "energy and pace scores high; one is a 3am chaos gremlin and the other wants a Gantt chart "
    "scores low. Two people who both vanish and build alone is friction, not fit - score that "
    "in the 70s, not the 90s. "
    'Return ONLY a JSON object: {"<id>": {"passion": n, "style": n}, ...}. No prose.'
)


def score_pairs(user: Dict, candidates: List[Dict]) -> Dict[str, Dict[str, int]]:
    key = _key(
        "score_pairs",
        _profile_fingerprint(user),
        sorted(c["id"] for c in candidates),
    )

    def live():
        body = "USER\n" + _describe(user) + "\n\nCANDIDATES\n" + "\n\n".join(
            f"id: {c['id']}\n" + _describe(c) for c in candidates
        )
        raw = client.ask(SCORE_SYSTEM, body, max_tokens=2000)
        if not raw:
            return None
        data = client.parse_json(raw)
        out = {}
        for c in candidates:
            row = data.get(c["id"]) or {}
            out[c["id"]] = {
                "passion": int(max(0, min(100, row.get("passion", 50)))),
                "style": int(max(0, min(100, row.get("style", 50)))),
            }
        return out

    return _cached(key, live, lambda: fallbacks.score_pairs(user, candidates))


# --- B ---------------------------------------------------------------------

TITLE_SYSTEM = (
    "Write a 5-9 word builder title for this person, like "
    '"Backend person who wants to build for musicians." Concrete and warm. '
    "No buzzwords. " + BAN + " Return the title only, no quotes, no period."
)


def builder_title(profile: Dict) -> str:
    key = _key("builder_title", _profile_fingerprint(profile))

    def live():
        raw = client.ask(TITLE_SYSTEM, _describe(profile), max_tokens=60)
        if not raw:
            return None
        return raw.strip().strip('"').rstrip(".")

    return _cached(key, live, lambda: fallbacks.builder_title(profile))


# --- C ---------------------------------------------------------------------

EXPLAIN_SYSTEM = (
    "Write exactly two sentences, in second person, to the USER, about why these two should "
    "build together. Lead with the two strongest reasons from the score breakdown you are "
    "given, but never recite numbers. Name specific skills and the specific thing they both "
    "want to build. Sound like a friend who knows both of them, not a report. " + BAN + " "
    "Return the two sentences only."
)


def explain_match(user: Dict, other: Dict, score: Dict, fills: List[str]) -> str:
    key = _key("explain", _profile_fingerprint(user), _profile_fingerprint(other))

    def live():
        body = (
            "USER\n" + _describe(user) + "\n\nOTHER\n" + _describe(other) +
            "\n\nSCORE BREAKDOWN (do not quote these numbers)\n" + json.dumps(score) +
            "\nSkills they have that the user is missing: " + ", ".join(fills)
        )
        raw = client.ask(EXPLAIN_SYSTEM, body, max_tokens=220)
        return raw.strip() if raw else None

    return _cached(key, live, lambda: fallbacks.explain_match(user, other, score, fills))


# --- D ---------------------------------------------------------------------

IDEAS_SYSTEM = (
    "Propose three projects these two people could build. Each must draw on BOTH skill sets "
    "and sit at the intersection of both 'wants to build' answers. Fields: name (1-3 words), "
    "one_liner (20 words max), roles {me, them} (one concrete phrase each, derived from their "
    "actual skills), difficulty (weekend | month | startup). Exactly one must be weekend. "
    + BAN + " Return ONLY a JSON array of three objects."
)

VALID_DIFF = {"weekend", "month", "startup"}


def generate_ideas(user: Dict, other: Dict) -> List[Dict]:
    key = _key("ideas", _profile_fingerprint(user), _profile_fingerprint(other))

    def live():
        body = "ME\n" + _describe(user) + "\n\nTHEM\n" + _describe(other)
        raw = client.ask(IDEAS_SYSTEM, body, max_tokens=900)
        if not raw:
            return None
        data = client.parse_json(raw)
        if not isinstance(data, list) or len(data) < 3:
            return None
        out = []
        for row in data[:3]:
            roles = row.get("roles") or {}
            diff = row.get("difficulty", "month")
            out.append(
                {
                    "name": str(row.get("name", "Untitled"))[:40],
                    "one_liner": str(row.get("one_liner", ""))[:160],
                    "roles": {"me": str(roles.get("me", ""))[:80], "them": str(roles.get("them", ""))[:80]},
                    "difficulty": diff if diff in VALID_DIFF else "month",
                }
            )
        if not any(i["difficulty"] == "weekend" for i in out):
            out[0]["difficulty"] = "weekend"
        return out

    return _cached(key, live, lambda: fallbacks.generate_ideas(user, other))


# --- E ---------------------------------------------------------------------

MISSION_SYSTEM = (
    "Two people just matched and picked a project. Write their First 30 Minutes: three "
    "concrete steps they can do right now, each requiring them to talk to each other. "
    "15 words max per step. No 'brainstorm'. No 'align on vision'. No 'discuss'. "
    'Return ONLY {"steps": ["", "", ""]}.'
)


def first_mission(user: Dict, other: Dict, idea: Dict) -> Dict:
    key = _key("mission", _profile_fingerprint(user), _profile_fingerprint(other), idea.get("name"))

    def live():
        body = (
            "ME\n" + _describe(user) + "\n\nTHEM\n" + _describe(other) +
            "\n\nPROJECT\n" + json.dumps(idea)
        )
        raw = client.ask(MISSION_SYSTEM, body, max_tokens=300)
        if not raw:
            return None
        data = client.parse_json(raw)
        steps = [str(s) for s in (data.get("steps") or [])][:3]
        return {"steps": steps} if len(steps) == 3 else None

    return _cached(key, live, lambda: fallbacks.first_mission(user, other, idea))


# --- F ---------------------------------------------------------------------

REPLY_SYSTEM = (
    "You are replying as this person in a chat with someone they just matched with on a "
    "builder app. Stay in their voice, using their prompt answers as the voice reference. "
    "25 words max. Lowercase is fine. " + BAN + " Return the message only."
)


def simulate_reply(user: Dict, other: Dict, chat: List[Dict]) -> str:
    turn = sum(1 for m in chat if m.get("from") == "them")
    last = next((m["text"] for m in reversed(chat) if m.get("from") == "me"), "")
    key = _key("reply", other.get("id"), turn, last.strip().lower())

    def live():
        body = (
            "YOU ARE\n" + _describe(other) + "\n\nTHEY JUST SAID\n" + last +
            "\n\nCONVERSATION SO FAR\n" + json.dumps(chat[-6:])
        )
        raw = client.ask(REPLY_SYSTEM, body, max_tokens=120)
        return raw.strip() if raw else None

    return _cached(key, live, lambda: fallbacks.simulate_reply(other, chat))
