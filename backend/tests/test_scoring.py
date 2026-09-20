"""The demo depends on Amara landing near the top. That is what this file guards."""

import scoring
from ai import calls, fallbacks
from seed.roster import DEMO_USER, ROSTER
from taxonomy import SKILLS


def stack(ai=None):
    ai = ai or calls.score_pairs(DEMO_USER, ROSTER)
    return scoring.build_stack(DEMO_USER, ROSTER, ai)


def position_of(rows, pid):
    return next(i for i, r in enumerate(rows, 1) if r["profile"]["id"] == pid)


def print_top(rows, label):
    print(f"\n{label}")
    for i, r in enumerate(rows[:5], 1):
        s = r["score"]
        print(
            "  %d. %-18s overall=%3d  skills=%3d passion=%3d style=%3d commit=%3d exp=%3d  %s"
            % (i, r["profile"]["name"], s["overall"], s["skills"], s["passion"], s["style"],
               s["commitment"], s["experience"], r["fit_label"])
        )


def test_amara_is_top_three_with_eighty_plus():
    """Shipped path: the committed cache. No overrides, no special-casing of her id."""
    rows = stack()
    print_top(rows, "Demo fill stack (committed cache):")
    amara = next(r for r in rows if r["profile"]["id"] == "p_amara")
    assert position_of(rows, "p_amara") <= 3
    assert amara["score"]["overall"] >= 80
    assert amara["score"]["skills"] == 100


def test_amara_holds_with_no_cache_at_all():
    """Cold path: the heuristic alone must also put her there."""
    rows = stack(fallbacks.score_pairs(DEMO_USER, ROSTER))
    print_top(rows, "Demo fill stack (heuristic only):")
    assert position_of(rows, "p_amara") <= 3
    assert next(r for r in rows if r["profile"]["id"] == "p_amara")["score"]["overall"] >= 80


def test_complementarity_is_visible_both_ways():
    amara = next(r for r in stack() if r["profile"]["id"] == "p_amara")
    assert "Backend" in amara["fills"] and "Data" in amara["fills"]
    assert "Frontend" in amara["you_bring"]
    assert amara["fit_label"] == "Strong complement"


def test_stack_is_sorted_by_overall():
    overalls = [r["score"]["overall"] for r in stack()]
    assert overalls == sorted(overalls, reverse=True)


def test_scores_stay_inside_zero_to_hundred():
    for row in stack():
        for key, value in row["score"].items():
            assert 0 <= value <= 100, f"{key} out of range: {value}"


def test_skills_is_pure_set_math():
    me = {"skills": [{"name": "Backend", "level": "expert"}], "missing": ["Frontend"]}
    them = {"skills": [{"name": "Frontend", "level": "expert"}], "missing": ["Backend"]}
    score, fills = scoring.skills_score(me, them)
    assert fills == ["Frontend"]
    assert score == 100

    nothing = {"skills": [{"name": "Data"}], "missing": ["Security"]}
    score, fills = scoring.skills_score(me, nothing)
    assert fills == []
    assert score == 0


def test_commitment_and_experience_tables():
    assert scoring.commitment_score("hackathon", "hackathon") == 100
    assert scoring.commitment_score("hackathon", "side_project") == 60
    assert scoring.commitment_score("hackathon", "cofounder") == 10
    assert scoring.experience_score("shipped", "shipped") == 80
    assert scoring.experience_score("shipped", "founded") == 100
    assert scoring.experience_score("first_hackathon", "founded") == 60


def test_low_commitment_sinks_but_is_not_hidden():
    """A cofounder-seeker still sees the hackathon crowd, just at the bottom."""
    seeker = {**DEMO_USER, "commitment": "cofounder"}
    rows = scoring.build_stack(seeker, ROSTER, calls.score_pairs(DEMO_USER, ROSTER))
    assert len(rows) == len(ROSTER)
    flags = [r["score"]["commitment"] >= scoring.SOFT_FILTER for r in rows]
    assert False in flags
    assert flags == sorted(flags, reverse=True)
    eligible = [r["score"]["overall"] for r, ok in zip(rows, flags) if ok]
    assert eligible == sorted(eligible, reverse=True)


def test_roster_uses_only_taxonomy_skills():
    for p in ROSTER + [DEMO_USER]:
        for s in p["skills"]:
            assert s["name"] in SKILLS, f"{p['id']} has unknown skill {s['name']}"
        for m in p["missing"]:
            assert m in SKILLS, f"{p['id']} is missing unknown skill {m}"


def test_every_profile_has_all_three_prompts():
    for p in ROSTER:
        for field in ("hackathon_person", "toxic_trait", "excited_about"):
            assert p["prompts"][field].strip(), f"{p['id']} missing {field}"
