"""Deterministic where it can be, the model only for passion and style."""

from typing import Dict, List, Tuple

from taxonomy import COMMITMENTS, EXPERIENCES, LEVEL_WEIGHT

WEIGHTS = {
    "skills": 0.35,
    "passion": 0.30,
    "style": 0.20,
    "commitment": 0.10,
    "experience": 0.05,
}

SOFT_FILTER = 50  # commitment below this sinks to the bottom, never hidden


def _levels(profile: Dict) -> Dict[str, str]:
    return {s["name"]: s.get("level", "solid") for s in profile.get("skills") or []}


def skills_score(me: Dict, them: Dict) -> Tuple[int, List[str]]:
    """Pure set math. Returns the score and the skills they fill for me."""
    my_skills, their_skills = _levels(me), _levels(them)
    my_missing = set(me.get("missing") or [])
    their_missing = set(them.get("missing") or [])

    fills = [s for s in their_skills if s in my_missing]
    overlap = sum(LEVEL_WEIGHT.get(their_skills[s], 1.0) for s in fills)
    overlap += sum(
        LEVEL_WEIGHT.get(my_skills[s], 1.0) for s in my_skills if s in their_missing
    )

    denom = len(my_missing) + len(their_missing)
    if denom == 0:
        return 0, []
    score = int(round(min(100.0, 100.0 * overlap / denom)))
    fills.sort(key=lambda s: -LEVEL_WEIGHT.get(their_skills[s], 1.0))
    return score, fills


def commitment_score(a: str, b: str) -> int:
    if a == b:
        return 100
    try:
        gap = abs(COMMITMENTS.index(a) - COMMITMENTS.index(b))
    except ValueError:
        return 50
    return 60 if gap == 1 else 10


def experience_score(a: str, b: str) -> int:
    if a == b:
        return 80
    try:
        gap = abs(EXPERIENCES.index(a) - EXPERIENCES.index(b))
    except ValueError:
        return 70
    return 100 if gap == 1 else 60


def overall(parts: Dict[str, int]) -> int:
    return int(round(sum(parts[k] * w for k, w in WEIGHTS.items())))


def score_one(me: Dict, them: Dict, ai: Dict[str, int]) -> Tuple[Dict[str, int], List[str]]:
    sk, fills = skills_score(me, them)
    parts = {
        "skills": sk,
        "passion": int(ai.get("passion", 50)),
        "style": int(ai.get("style", 50)),
        "commitment": commitment_score(me.get("commitment"), them.get("commitment")),
        "experience": experience_score(me.get("experience"), them.get("experience")),
    }
    return {"overall": overall(parts), **parts}, fills


def you_bring(me: Dict, them: Dict) -> List[str]:
    """My skills that sit in their missing list, strongest first."""
    mine = _levels(me)
    their_missing = set(them.get("missing") or [])
    out = [s for s in mine if s in their_missing]
    out.sort(key=lambda s: -LEVEL_WEIGHT.get(mine[s], 1.0))
    return out


def fit_label(score: Dict[str, int]) -> str:
    if score["overall"] >= 85:
        return "Strong complement"
    if score["overall"] >= 70:
        return "Good complement"
    return "Worth a look"


def hook_line(score: Dict[str, int], fills: List[str]) -> str:
    if fills:
        return f"{score['overall']}% · they have the {fills[0]} you're missing"
    return f"{score['overall']}% · you want to build the same thing"


def build_stack(me: Dict, candidates: List[Dict], ai_scores: Dict[str, Dict[str, int]]) -> List[Dict]:
    rows = []
    for c in candidates:
        score, fills = score_one(me, c, ai_scores.get(c["id"], {}))
        rows.append(
            {
                "profile": c,
                "score": score,
                "fills": fills,
                "you_bring": you_bring(me, c),
                "fit_label": fit_label(score),
                "hook": hook_line(score, fills),
            }
        )
    rows.sort(
        key=lambda r: (
            r["score"]["commitment"] >= SOFT_FILTER,  # soft filter: low commitment sinks
            r["score"]["overall"],
        ),
        reverse=True,
    )
    return rows
