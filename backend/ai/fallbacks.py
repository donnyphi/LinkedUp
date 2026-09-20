"""Deterministic stand-ins for every AI call.

Nothing in here touches the network. If the model key is missing or the API
is down mid-demo, these run instead and the UI never shows an error.
"""

import math
import re
from typing import Dict, List

AMARA_ID = "p_amara"

# --- text features ---------------------------------------------------------

CLUSTERS = {
    "music": "music musician musicians producer producers song songs track tracks audio "
    "studio dsp sound beat beats loop loops band record recording mixing mastering "
    "sample samples demo demos synth vinyl label bedroom melody lyrics gig chord chords",
    "creative": "creative art artist artists draw drawing paint film photo photos zine "
    "portfolio craft making maker aesthetic",
    "health": "health mental therapy therapist clinic patient patients medical hospital "
    "fitness sleep doctor nurse anxiety wellness",
    "finance": "fintech finance financial money bank banking invest investing budget "
    "budgeting payments payroll compliance tax crypto wallet expenses",
    "education": "learn learning student students teach teaching school class classes "
    "study studying tutor homework education lecture lectures seminar course curriculum theory",
    "social": "social friends friendship community people connect connecting lonely "
    "loneliness together strangers friend meet meeting group belonging room rooms feed",
    "climate": "climate carbon energy solar waste recycling recycle sustainable "
    "sustainability environment emissions green",
    "games": "game games gaming player players quest arcade rpg multiplayer speedrun",
    "devtools": "developer developers devs code coding api apis infra deploy deploying "
    "debug debugging terminal cli library framework open-source tooling",
    "science": "research lab bio biology protein physics astronomy genome chemistry "
    "neuroscience dataset experiment",
    "food": "food restaurant restaurants recipe recipes cook cooking kitchen coffee menu "
    "farmers grocery",
    "civic": "city transit housing government voting civic local neighborhood neighbors "
    "neighbor block blocks bus buses cities campus campuses dorm public policy municipal commute commuters",
    "commerce": "shop store retail marketplace sell selling brand fashion ecommerce "
    "inventory manufacturer manufacturers boutique",
    "productivity": "productivity notes todo calendar focus habit habits organize "
    "workflow scheduling inbox planning",
    "accessibility": "accessible accessibility assistive disability disabled blind deaf caption "
    "captions screenreader wheelchair haptic",
    "sports": "sport sports run running climb climbing basketball soccer gym training "
    "athlete cycling",
    "hardware": "hardware device sensor sensors robot robotics drone arduino circuit "
    "wearable prototype 3d-printed",
}

CLUSTER_WORDS = {k: set(v.split()) for k, v in CLUSTERS.items()}

STOP = set(
    "a an the and or but for to of in on with that this it is are be been being was were "
    "i you we they my your our their me them who what when where how why so just really "
    "something someone people thing things want wants wanted build building builds make "
    "makes making help helps helping better more less than into out up down over can "
    "cant dont im ive get gets getting like about actually still never always".split()
)

CHAOS = set(
    "3am 2am 4am chaos gremlin feral unhinged disappear disappears rewrite rewrites "
    "refactor refactors scrap panic caffeine espresso allnighter vibes obsess obsessed "
    "rabbit hole sleep insomnia chaotic impulsive random tangent tangents spiral "
    "overthink hyperfixate fight fighting arguing yell".split()
)

PLANNER = set(
    "plan plans planning roadmap gantt spec specs schedule scheduled organize organized "
    "timeline checklist standup standups document documentation process deadline "
    "deadlines structure structured methodical systematic agenda ticket tickets "
    "prioritize scope".split()
)


def _tokens(text: str) -> List[str]:
    return [t for t in re.findall(r"[a-z0-9]+", (text or "").lower()) if t not in STOP]


def _cluster_vec(text: str) -> Dict[str, float]:
    toks = _tokens(text)
    vec: Dict[str, float] = {}
    for name, words in CLUSTER_WORDS.items():
        hit = sum(1 for t in toks if t in words)
        if hit:
            vec[name] = float(hit)
    return vec


def _intersect(a: Dict[str, float], b: Dict[str, float]) -> float:
    """How much of each person's attention lands on the same subjects.

    Cosine is far too generous here: one shared word in a one-cluster vector
    reads as a perfect match. Histogram intersection asks what share of both
    people's focus actually overlaps.
    """
    if not a or not b:
        return 0.0
    sa, sb = sum(a.values()), sum(b.values())
    return sum(min(a[k] / sa, b.get(k, 0.0) / sb) for k in a)


def _jaccard(a: List[str], b: List[str]) -> float:
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def top_cluster(*texts: str) -> str:
    total: Dict[str, float] = {}
    for t in texts:
        for k, v in _cluster_vec(t).items():
            total[k] = total.get(k, 0.0) + v
    if not total:
        return "generic"
    return max(total.items(), key=lambda kv: kv[1])[0]


# --- A. score_pairs --------------------------------------------------------


def passion_score(mine: str, theirs: str) -> int:
    va, vb = _cluster_vec(mine), _cluster_vec(theirs)
    hist = _intersect(va, vb)
    # One keyword is weak evidence of a shared obsession. Two is a signal.
    hist *= min(1.0, min(sum(va.values(), 0.0), sum(vb.values(), 0.0)) / 2.0)
    jac = _jaccard(_tokens(mine), _tokens(theirs))
    score = 24 + 74 * (0.85 * hist + 0.15 * min(1.0, jac * 2.6))
    # Both clearly obsessed with the same subject, not just adjacent to it.
    shared = set(va) & set(vb)
    if any(va[k] >= 2 and vb[k] >= 2 for k in shared):
        score += 6
    return int(round(max(20.0, min(97.0, score))))


def _style_vec(prompts: Dict[str, str]) -> List[float]:
    text = " ".join((prompts or {}).values())
    toks = _tokens(text)
    n = max(1, len(toks))
    chaos = sum(1 for t in toks if t in CHAOS) / n
    plan = sum(1 for t in toks if t in PLANNER) / n
    length = min(1.0, len(toks) / 40.0)
    punch = min(1.0, text.count("!") / 3.0)
    return [chaos * 6, plan * 6, length, punch]


def style_score(mine: Dict[str, str], theirs: Dict[str, str]) -> int:
    a, b = _style_vec(mine), _style_vec(theirs)
    dist = math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))
    # Two people who are both all-chaos also generate friction, not only fit.
    both_chaos = min(a[0], b[0])
    score = 96 - dist * 34 - both_chaos * 12
    return int(round(max(30.0, min(97.0, score))))


def score_pairs(user: Dict, candidates: List[Dict]) -> Dict[str, Dict[str, int]]:
    out = {}
    for c in candidates:
        out[c["id"]] = {
            "passion": passion_score(user.get("want_to_build", ""), c.get("want_to_build", "")),
            "style": style_score(user.get("prompts", {}), c.get("prompts", {})),
        }
    return out


# --- B. builder_title ------------------------------------------------------

ROLE_WORD = {
    "Frontend": "Frontend person",
    "Backend": "Backend person",
    "Mobile (iOS)": "iOS dev",
    "Mobile (Android)": "Android dev",
    "ML / AI": "ML person",
    "Data": "Data person",
    "DevOps / Infra": "Infra person",
    "Systems / Low-level": "Systems person",
    "Security": "Security person",
    "Game dev": "Game dev",
    "Hardware / Embedded": "Hardware person",
    "Product design": "Designer",
    "Visual design": "Visual designer",
    "UX research": "UX researcher",
    "Motion / 3D": "Motion designer",
    "Product management": "PM",
    "Marketing / Growth": "Growth person",
    "Sales / BD": "Sales person",
    "Fundraising": "Fundraiser",
    "Finance": "Finance person",
    "Writing / Content": "Writer",
    "Community": "Community person",
    "Video": "Video person",
    "Music production": "Producer",
}


def _top_skill(profile: Dict) -> str:
    order = {"expert": 3, "solid": 2, "learning": 1}
    skills = profile.get("skills") or []
    if not skills:
        return "Builder"
    best = max(skills, key=lambda s: order.get(s.get("level", "solid"), 2))
    return ROLE_WORD.get(best["name"], best["name"])


# Words a clause must not end on, or the title reads like it got cut off.
DANGLING = set(
    "a an the you your we our they their my me it its this that these those and or "
    "but for with without to of in on at from by as is are was were be been who "
    "which when where how why into onto over under so than then".split()
)


def _build_clause(text: str, words: int = 7) -> str:
    text = (text or "").strip().rstrip(".")
    if not text:
        return "something worth finishing"
    parts = text.split()[:words]
    while len(parts) > 2 and parts[-1].lower().strip(",") in DANGLING:
        parts.pop()
    clause = " ".join(parts).rstrip(",")
    return clause[0].lower() + clause[1:] if clause else clause


def builder_title(profile: Dict) -> str:
    return f"{_top_skill(profile)} who wants to build {_build_clause(profile.get('want_to_build', ''), 5)}"


# --- C. explain_match ------------------------------------------------------

AMARA_EXPLANATION = (
    "Amara has the Backend and Data you're missing, and you have the Frontend and Product design "
    "Late Bus has been missing. She's making the city bus tell the truth about itself; you're doing "
    "the same for the dining hall line - same instinct, different building."
)


def explain_match(user: Dict, other: Dict, score: Dict, fills: List[str]) -> str:
    if other.get("id") == AMARA_ID:
        return AMARA_EXPLANATION
    name = other.get("name", "They").split()[0]
    theirs = fills[:2] or [s["name"] for s in (other.get("skills") or [])][:2]
    mine = {s["name"] for s in (user.get("skills") or [])}
    mine_gaps = [g for g in (other.get("missing") or []) if g in mine][:2]

    a = " and ".join(theirs) if theirs else "skills you don't have"
    if mine_gaps:
        first = (
            f"{name} brings {a} to the exact hole in your list, and you cover the "
            f"{' and '.join(mine_gaps)} they went looking for."
        )
    else:
        first = f"{name} brings {a} straight to the gap you wrote down."
    # Their own words, whole. Cutting this sentence short reads like a bug.
    theirs_said = (other.get("want_to_build") or "").strip().rstrip(".")
    if theirs_said:
        theirs_said = theirs_said[0].lower() + theirs_said[1:]
        second = (
            f"You're both circling the same thing - {theirs_said} - so there's a real "
            "project here, not just a good conversation."
        )
    else:
        second = "You're after the same kind of thing, so there's a real project here."
    return first + " " + second


# --- D. generate_ideas -----------------------------------------------------

AMARA_IDEAS = [
    {
        "name": "Block Board",
        "one_liner": "One page per block for the things neighbors actually need to know.",
        "roles": {"me": "The block page, posts UI, mobile layout", "them": "Data model, backend, the feed"},
        "difficulty": "weekend",
        "needs": ["Product design", "Community"],
    },
    {
        "name": "Late Bus",
        "one_liner": "Shows what your commute really did this month, not the posted schedule.",
        "roles": {"me": "The daily view and the sharing card", "them": "Transit data pipeline, the numbers"},
        "difficulty": "month",
        "needs": ["UX research"],
    },
    {
        "name": "City Hall API",
        "one_liner": "Makes local government data usable by the people who live there.",
        "roles": {"me": "Docs site, explorer UI, developer onboarding", "them": "Scrapers, schema, the API itself"},
        "difficulty": "startup",
        "needs": ["DevOps / Infra", "Community"],
    },
]

IDEA_TEMPLATES = {
    "music": [
        ("Loop Swap", "Post an unfinished loop, get it back finished by someone else.", "weekend"),
        ("Setlist", "A shared workspace where two people finish one track together.", "month"),
        ("Bedroom Label", "Tools that turn a folder of demos into an actual release.", "startup"),
    ],
    "social": [
        ("Two Strangers", "One shared task a day for two people who just met.", "weekend"),
        ("Roomlist", "Small rooms that expire unless people actually show up.", "month"),
        ("Showing Up", "A network built on what people did together, not who they know.", "startup"),
    ],
    "education": [
        ("Office Hours", "Book fifteen minutes with someone who just learned the thing.", "weekend"),
        ("Problem Sets", "Turn any lecture into a set of problems you can argue about.", "month"),
        ("The Long Class", "A course that only advances when you teach someone else.", "startup"),
    ],
    "devtools": [
        ("Repo Radar", "Tells you which of your dead repos is closest to working.", "weekend"),
        ("Pairbox", "A shared terminal that records why you made each change.", "month"),
        ("Deploy Club", "Infra for small teams who ship weekly and hate configuring things.", "startup"),
    ],
    "health": [
        ("Check In", "Two people, one honest question a day, no feed.", "weekend"),
        ("Between Visits", "Keeps track of what actually changed since the last appointment.", "month"),
        ("Small Clinic", "Scheduling and notes for practices too small for real software.", "startup"),
    ],
    "climate": [
        ("Waste Map", "Photograph a bin, find out where that thing actually goes.", "weekend"),
        ("Watt Diary", "Shows a household which single change is worth making.", "month"),
        ("Grid Notes", "Tools for the people doing energy retrofits building by building.", "startup"),
    ],
    "commerce": [
        ("First Hundred", "Helps a tiny brand find its first hundred real customers.", "weekend"),
        ("Small Batch", "Run a limited drop end to end without a storefront.", "month"),
        ("Maker Supply", "Connects independent makers to manufacturers who take small runs.", "startup"),
    ],
    "games": [
        ("Two Player", "A game that only works if both people are on a call.", "weekend"),
        ("Mod Kit", "Lets players build levels without touching the engine.", "month"),
        ("Studio of Two", "Tooling for pairs shipping small games often.", "startup"),
    ],
    "civic": [
        ("Block Board", "One page per block for things neighbors need to know.", "weekend"),
        ("Late Bus", "Shows what your commute actually did this month, not the schedule.", "month"),
        ("City Hall API", "Makes local government data usable by people who live there.", "startup"),
    ],
    "generic": [
        ("Weekend One", "The smallest version of your idea that a stranger could use.", "weekend"),
        ("Second Pass", "The same idea, rebuilt properly, with real data behind it.", "month"),
        ("The Long Bet", "The version you'd drop other things for.", "startup"),
    ],
}


def generate_ideas(user: Dict, other: Dict) -> List[Dict]:
    if other.get("id") == AMARA_ID:
        return [dict(i) for i in AMARA_IDEAS]
    cluster = top_cluster(user.get("want_to_build", ""), other.get("want_to_build", ""))
    rows = IDEA_TEMPLATES.get(cluster, IDEA_TEMPLATES["generic"])
    my_role = _top_skill(user)
    their_role = _top_skill(other)
    return [
        {
            "name": name,
            "one_liner": line,
            "roles": {"me": f"{my_role} work, end to end", "them": f"{their_role} work, end to end"},
            "difficulty": diff,
        }
        for name, line, diff in rows
    ]


# --- E. first_mission ------------------------------------------------------

AMARA_MISSION = [
    "Each say the one thing Block Board must do or it's pointless.",
    "Sketch the block page on paper together. Ten minutes, no laptops.",
    "Name it, claim the repo, push one empty commit.",
]

GENERIC_MISSION = [
    "Each say the one thing this has to do to be worth building.",
    "Sketch the main screen on paper together. Ten minutes, no laptops.",
    "Name it, claim the repo, push one empty commit.",
]


def first_mission(user: Dict, other: Dict, idea: Dict) -> Dict:
    if other.get("id") == AMARA_ID:
        return {"steps": list(AMARA_MISSION)}
    return {"steps": list(GENERIC_MISSION)}


# --- suggestion reasons (Home feed, Discover, right rail) -------------------
#
# Two sentences, every clause grounded in a real field. No model call: these run
# on every Home load, so they must be instant and deterministic.

THEME = {
    "civic": "tools for cities",
    "education": "learning tools",
    "music": "music",
    "social": "helping people actually show up for each other",
    "health": "health",
    "climate": "climate",
    "games": "games",
    "devtools": "developer tools",
    "commerce": "small businesses",
    "accessibility": "accessibility",
    "hardware": "hardware",
    "science": "research tools",
    "creative": "creative tools",
    "productivity": "productivity",
    "finance": "money tools",
    "food": "food",
    "sports": "sport",
}

AREA_LABEL = {
    "civic": "civic-tech",
    "education": "learning",
    "social": "social",
    "accessibility": "accessibility",
    "health": "health",
    "climate": "climate",
    "music": "music",
    "games": "game",
    "devtools": "developer-tools",
    "commerce": "commerce",
    "hardware": "hardware",
}


def shared_theme(a_text: str, b_text: str) -> str:
    va, vb = _cluster_vec(a_text), _cluster_vec(b_text)
    shared = {k: min(va[k], vb[k]) for k in va if k in vb}
    if not shared:
        return ""
    return THEME.get(max(shared.items(), key=lambda kv: kv[1])[0], "")


def suggestion_reason(me: Dict, other: Dict, fills: List[str], you_bring: List[str], post: Dict = None) -> str:
    first = (other.get("name") or "They").split()[0]
    my_top = _top_skill(me).replace(" person", "").replace("Designer", "product design").lower()
    theme = shared_theme(me.get("want_to_build", ""), (post or {}).get("text", "") + " " + other.get("want_to_build", ""))
    inferred = (post or {}).get("inferred") or {}
    needs = [n for n in inferred.get("needs") or [] if n in {s["name"] for s in me.get("skills") or []}]

    if post and needs:
        area = AREA_LABEL.get(inferred.get("area", ""), inferred.get("area", "")) or "side"
        first_sentence = f"{first} wants {needs[0].lower()} help for a {area} project."
    elif fills:
        first_sentence = f"{first} brings {' and '.join(fills[:2])}, the thing you said you're missing."
    elif you_bring:
        first_sentence = f"{first} is missing {you_bring[0]}, which is the thing you do best."
    else:
        first_sentence = f"{first} is after the same kind of thing you are."

    if theme and (needs or you_bring):
        second = f"You specialize in {(needs[0] if needs else you_bring[0]).lower()}, and you both care about {theme}."
    elif theme:
        second = f"You both care about {theme}."
    elif you_bring:
        second = f"You bring {you_bring[0]}, which is the one thing their side is missing."
    else:
        second = f"You're both circling the same thing - {_build_clause(other.get('want_to_build', ''), 9)}."
    return first_sentence + " " + second


# --- a project's missing piece --------------------------------------------------
#
# Deterministic. Coverage of the project's declared needs (level-weighted) plus
# how much the candidate's own ambition overlaps the project. Nobody is named.

from taxonomy import LEVEL_WEIGHT as _LW


def missing_piece(project: Dict, candidates: List[Dict]) -> List[Dict]:
    needs = project.get("needs") or []
    text = project.get("one_liner", "")
    scored = []
    for c in candidates:
        if c["id"] in set(project.get("team_ids") or []):
            continue
        levels = {s["name"]: s.get("level", "solid") for s in c.get("skills") or []}
        covers = [n for n in needs if n in levels]
        coverage = sum(_LW.get(levels[n], 1.0) for n in covers) / max(1.0, 1.5 * len(needs))
        passion = passion_score(text, c.get("want_to_build", ""))
        score = int(round(100 * (0.7 * min(1.0, coverage) + 0.3 * passion / 100)))
        scored.append({"profile": c, "score": score, "covers": covers, "passion": passion})
    scored.sort(key=lambda r: (r["score"], len(r["covers"])), reverse=True)
    return scored


def missing_piece_reason(project: Dict, row: Dict) -> str:
    first = row["profile"]["name"].split()[0]
    covers = row["covers"]
    if covers:
        what = " and ".join(covers[:2])
        first_sentence = f"{first} brings {what}, {'the two things' if len(covers) >= 2 else 'the thing'} {project['name']} is missing."
    else:
        first_sentence = f"{first} is the closest fit for what {project['name']} still needs."
    second = f"{first} wants to build {_build_clause(row['profile'].get('want_to_build', ''), 12)}."
    return first_sentence + " " + second


# --- post inference (Create) ----------------------------------------------------
#
# The model does this when it can; this is what runs when it can't. Both return
# the same shape: area, needs (taxonomy names), platform, commitment.

SKILL_ALIASES = {
    "Frontend": ["frontend", "front-end", "front end", "react", "css", "web ui"],
    "Backend": ["backend", "back-end", "back end", "api", "server", "database"],
    "Mobile (iOS)": ["ios", "iphone", "swift", "swiftui"],
    "Mobile (Android)": ["android", "kotlin"],
    "ML / AI": ["ml", "machine learning", "ai", "model", "llm", "computer vision", "cv"],
    "Data": ["data", "analytics", "pipeline", "sql", "dataset"],
    "DevOps / Infra": ["devops", "infra", "deploy", "kubernetes", "docker"],
    "Systems / Low-level": ["systems", "low-level", "rust", "c++", "embedded systems"],
    "Security": ["security", "auth", "pentest"],
    "Game dev": ["game", "unity", "godot"],
    "Hardware / Embedded": ["hardware", "arduino", "pcb", "sensor", "robot"],
    "Product design": ["designer", "product design", "ui/ux", "ui design", "design help", "design person"],
    "Visual design": ["visual design", "branding", "logo", "illustration"],
    "UX research": ["ux research", "user research", "interviews"],
    "Motion / 3D": ["motion", "3d", "animation"],
    "Product management": ["pm", "product manager", "product management"],
    "Marketing / Growth": ["marketing", "growth", "users", "distribution"],
    "Sales / BD": ["sales", "bd", "partnerships"],
    "Fundraising": ["fundraising", "investors", "raise"],
    "Finance": ["finance", "budget", "accounting"],
    "Writing / Content": ["writing", "writer", "content", "copy"],
    "Community": ["community", "organizer", "moderator"],
    "Video": ["video", "filming", "editor"],
    "Music production": ["audio", "music", "sound", "producer"],
}

PLATFORM_WORDS = {"ios": "ios", "iphone": "ios", "android": "android", "mobile": "mobile", "phone": "mobile",
                  "web": "web", "website": "web", "browser": "web", "hardware": "hardware", "glove": "hardware"}


def infer_post(text: str, post_type: str = "update") -> Dict:
    low = (text or "").lower()
    needs = []
    if post_type == "looking_for" or "looking for" in low or "need" in low or "anyone" in low:
        for skill, aliases in SKILL_ALIASES.items():
            if any(re.search(r"\b" + re.escape(a) + r"\b", low) for a in aliases):
                needs.append(skill)
    area = top_cluster(text)
    platform = next((v for k, v in PLATFORM_WORDS.items() if re.search(r"\b" + k + r"\b", low)), None)
    if any(w in low for w in ("hackathon", "this weekend", "tonight")):
        commitment = "hackathon"
    elif any(w in low for w in ("cofounder", "co-founder", "startup", "company")):
        commitment = "cofounder"
    else:
        commitment = "side_project"
    return {"area": area if area != "generic" else None, "needs": needs[:3], "platform": platform, "commitment": commitment}


def ask_reason(me: Dict, other: Dict, covered: List[str], post_text: str) -> str:
    """Card under my own 'looking for' post: why this person answers it."""
    first = other["name"].split()[0]
    theme = shared_theme(me.get("want_to_build", "") + " " + post_text, other.get("want_to_build", ""))
    first_sentence = f"{first} brings {' and '.join(covered[:2])}, the thing you just asked for."
    if theme:
        second = f"You both care about {theme}."
    else:
        second = f"{first} wants to build {_build_clause(other.get('want_to_build', ''), 10)}."
    return first_sentence + " " + second
