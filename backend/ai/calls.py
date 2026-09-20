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


# --- F. teammate chat ----------------------------------------------------------
#
# The one call that is never cached and never canned. Every request carries the
# whole situation - both profiles, why they matched, the project they picked,
# the mission and its state, and the entire conversation - so the reply can
# only ever be about what was actually said.

CHAT_MAX_TOKENS = 150
CHAT_TEMPERATURE = 0.8

CHAT_RULES = """Rules:
- Respond directly to what they actually said. Never assume something was discussed that wasn't.
- Don't skip ahead. If they just say "hey", say hey back before any planning.
- Keep continuity with the full conversation. Never invent things they said.
- Sound like a real college student at a hackathon: casual, friendly, concise, collaborative.
- Usually one or two sentences. Lowercase is fine.
- No corporate language, no motivational-coach language. Don't sound like an AI assistant.
- Don't keep re-explaining why you matched. Mention the project when it's relevant.
- At most one question per reply. Don't force the checklist into every reply.
- Gently move toward actually building something.
- If they volunteer to own a task, react to it and pick a complementary one for yourself.
- You may disagree if their idea seems weak.
- Return only the message. No quotes, no name prefix, no metadata."""

CHAT_EXAMPLES = """Tuning examples (project here is "Block Board"):
USER: hey
GOOD: hey! glad we matched lol. you wanna figure out what Block Board should actually do first?
BAD: ok I'm in. what's the smallest version we could have working tonight?  (skips the greeting, assumes planning started)

USER: hey / YOU: (the good reply above) / USER: yeah what do you think
GOOD: I'd start stupid small - one block page where neighbors can post an update and mark what's important. if you take the frontend, I can wire up the data/backend.

USER: I can do the frontend
GOOD: perfect, I'll own the backend/data side then. wanna make the first version just posts + one 'important' flag?

USER: idk if this project is even useful
GOOD: fair lol. I think it only works if it tells you something your neighborhood group chat doesn't already tell you - maybe we pick one specific problem first?"""


def _persona_block(p: Dict, include_missing: bool) -> str:
    pr = p.get("prompts") or {}
    lines = [
        f"name: {p.get('name')}",
        f"school: {p.get('school')}",
        f"skills: {_skill_line(p)}",
    ]
    if include_missing:
        lines.append(f"missing skills: {', '.join(p.get('missing') or [])}")
    lines += [
        f"wants to build: {p.get('want_to_build')}",
        f"commitment: {p.get('commitment')} | experience: {p.get('experience')}",
        "working style, in their own words:",
        f"  - at a hackathon, the person who {pr.get('hackathon_person', '')}",
        f"  - toxic trait as a teammate: {pr.get('toxic_trait', '')}",
        f"  - irrationally excited about: {pr.get('excited_about', '')}",
    ]
    return "\n".join(lines)


def chat_system_prompt(user: Dict, other: Dict, match: Dict) -> str:
    first = (other.get("name") or "your teammate").split()[0]
    idea = None
    if match.get("chosen_idea") is not None and match.get("ideas"):
        idea = match["ideas"][match["chosen_idea"]]
    mission = match.get("mission") or {}
    steps = mission.get("steps") or []
    done = mission.get("done") or []

    if idea:
        roles = idea.get("roles") or {}
        project = (
            f"name: {idea.get('name')}\n"
            f"description: {idea.get('one_liner')}\n"
            f"your likely contribution: {roles.get('them', '')}\n"
            f"their likely contribution: {roles.get('me', '')}"
        )
    else:
        project = "not chosen yet - you are still deciding what to build together"

    if steps:
        mission_txt = "\n".join(f"{i + 1}. {step}" for i, step in enumerate(steps))
        progress = ", ".join(
            f"step {i + 1} {'done' if (i < len(done) and done[i]) else 'not done'}"
            for i in range(len(steps))
        )
    else:
        mission_txt, progress = "no mission yet", "nothing started"

    return (
        f"You are {other.get('name')}, a fictional demo persona in LinkedUp, an app that matches "
        f"student builders. You just matched with {user.get('name')} because you might be good "
        "people to build something together. You are chatting inside the app.\n\n"
        f"<your_profile>\n{_persona_block(other, include_missing=True)}\n</your_profile>\n\n"
        f"<other_person>\n{_persona_block(user, include_missing=True)}\n</other_person>\n\n"
        f"<why_you_matched>\n{match.get('explanation', '')}\n</why_you_matched>\n\n"
        f"<selected_project>\n{project}\n</selected_project>\n\n"
        f"<current_mission>\nFirst 30 minutes:\n{mission_txt}\n</current_mission>\n\n"
        f"<mission_progress>\n{progress}\n</mission_progress>\n\n"
        f"Respond as {first}. {CHAT_RULES}\n\n{CHAT_EXAMPLES}"
    )


def _transcript(other: Dict, chat: List[Dict]) -> str:
    first = (other.get("name") or "THEM").split()[0].upper()
    lines = []
    for m in chat:
        if m.get("from") == "me":
            lines.append(f"USER: {m['text']}")
        elif m.get("from") == "them":
            lines.append(f"{first}: {m['text']}")
    return "\n".join(lines) if lines else "(nothing yet)"


def _clean_reply(text: str, other: Dict) -> str:
    text = (text or "").strip()
    # Model sometimes wraps the line in quotes or labels it. Strip both.
    text = text.strip('"').strip("\u201c\u201d").strip("'").strip()
    first = (other.get("name") or "").split()[0] if other.get("name") else ""
    for prefix in (f"{first}:", f"{first.upper()}:", "YOU:", "You:"):
        if first and text.startswith(prefix):
            text = text[len(prefix):].strip()
    return text.strip('"').strip()


def teammate_reply(user: Dict, other: Dict, match: Dict) -> str:
    """Raises client.NoKey or client.CallFailed. Never returns an empty string."""
    system = chat_system_prompt(user, other, match)
    body = (
        "<conversation>\n" + _transcript(other, match.get("chat") or []) + "\n</conversation>\n\n"
        f"Write {other.get('name', 'your').split()[0]}'s next message."
    )
    messages = [{"role": "user", "content": body}]
    for _attempt in range(2):
        raw = client.complete(system, messages, max_tokens=CHAT_MAX_TOKENS, temperature=CHAT_TEMPERATURE)
        text = _clean_reply(raw, other)
        if text:
            return text
    raise client.CallFailed("Claude returned an empty reply twice")
