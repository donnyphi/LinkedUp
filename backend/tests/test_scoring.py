"""The demo depends on Maya landing at position 3. That is what this file guards."""

import scoring
from ai import calls, fallbacks
from seed.roster import ALEX, ROSTER
from taxonomy import SKILLS


def stack_with_cache():
    return scoring.build_stack(ALEX, ROSTER, calls.score_pairs(ALEX, ROSTER))


def position_of(rows, pid):
    return next(i for i, r in enumerate(rows, 1) if r["profile"]["id"] == pid)


def test_maya_is_third_or_fourth():
    rows = stack_with_cache()
    assert position_of(rows, "p_maya") in (3, 4)


def test_maya_scores_ninety_plus():
    rows = stack_with_cache()
    maya = next(r for r in rows if r["profile"]["id"] == "p_maya")
    assert maya["score"]["overall"] >= 90
    assert maya["score"]["skills"] == 100


def test_the_two_above_maya_are_the_right_ones():
    rows = stack_with_cache()
    assert [r["profile"]["id"] for r in rows[:2]] == ["p_dev", "p_sofia"]


def test_stack_is_sorted_by_overall():
    rows = stack_with_cache()
    overalls = [r["score"]["overall"] for r in rows]
    assert overalls == sorted(overalls, reverse=True)


def test_scores_stay_inside_zero_to_hundred():
    for row in stack_with_cache():
        for key, value in row["score"].items():
            assert 0 <= value <= 100, f"{key} out of range: {value}"


def test_offline_heuristic_still_ranks_maya_top_three():
    """No cache, no key: the safety net must still find her."""
    rows = scoring.build_stack(ALEX, ROSTER, fallbacks.score_pairs(ALEX, ROSTER))
    assert position_of(rows, "p_maya") <= 3


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
    seeker = {**ALEX, "commitment": "cofounder"}
    rows = scoring.build_stack(seeker, ROSTER, calls.score_pairs(ALEX, ROSTER))
    assert len(rows) == len(ROSTER)

    flags = [r["score"]["commitment"] >= scoring.SOFT_FILTER for r in rows]
    assert False in flags, "this fixture is pointless if nobody is filtered"
    assert flags == sorted(flags, reverse=True), "filtered people must all sit at the bottom"

    eligible = [r["score"]["overall"] for r, ok in zip(rows, flags) if ok]
    assert eligible == sorted(eligible, reverse=True)


def test_roster_uses_only_taxonomy_skills():
    for p in ROSTER + [ALEX]:
        for s in p["skills"]:
            assert s["name"] in SKILLS, f"{p['id']} has unknown skill {s['name']}"
        for m in p["missing"]:
            assert m in SKILLS, f"{p['id']} is missing unknown skill {m}"


def test_every_profile_has_all_three_prompts():
    for p in ROSTER:
        for field in ("hackathon_person", "toxic_trait", "excited_about"):
            assert p["prompts"][field].strip(), f"{p['id']} missing {field}"
