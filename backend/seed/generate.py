"""Writes data/seed_profiles.json and pre-fills data/ai_cache.json.

Run once, commit the output. Nothing here runs at request time.

With ANTHROPIC_API_KEY set, --live re-scores the demo user against the roster
with Claude and caches that instead of the values below.

    python -m seed.generate          # deterministic, no network
    python -m seed.generate --live   # ask Claude for the demo scores
"""

import json
import sys

import store
from ai import calls, fallbacks
from seed.roster import ALEX, ROSTER

# Hand-set scores for the three profiles the demo walks through. They follow the
# same rules the scoring prompt gives Claude: Dev and Sofia are in the same world
# as Alex, and Maya is the only one aimed at the exact same problem. Maya's style
# number is deliberately her weakest - two people who both vanish and build alone
# is friction, which is the whole reason the First 30 Minutes mission exists.
DEMO_SCORES = {
    "p_dev": {"passion": 93, "style": 90},
    "p_sofia": {"passion": 88, "style": 88},
    "p_maya": {"passion": 95, "style": 72},
}


def build_scores(live: bool):
    if live and __import__("ai.client", fromlist=["client"]).have_key():
        scores = calls.score_pairs(ALEX, ROSTER)
    else:
        scores = fallbacks.score_pairs(ALEX, ROSTER)
    scores = dict(scores)
    scores.update({k: dict(v) for k, v in DEMO_SCORES.items()})
    return scores


def main() -> None:
    live = "--live" in sys.argv

    store._write(store.SEEDS_PATH, ROSTER)
    store._write(store.PROFILES_PATH, ROSTER)
    store._write(store.MATCHES_PATH, [])

    cache = {}
    cache[calls._key("score_pairs", calls._profile_fingerprint(ALEX), sorted(p["id"] for p in ROSTER))] = build_scores(live)

    maya = next(p for p in ROSTER if p["id"] == "p_maya")
    cache[calls._key("explain", calls._profile_fingerprint(ALEX), calls._profile_fingerprint(maya))] = (
        fallbacks.MAYA_EXPLANATION
    )
    ideas = [dict(i) for i in fallbacks.MAYA_IDEAS]
    cache[calls._key("ideas", calls._profile_fingerprint(ALEX), calls._profile_fingerprint(maya))] = ideas
    for idea in ideas:
        key = calls._key(
            "mission", calls._profile_fingerprint(ALEX), calls._profile_fingerprint(maya), idea["name"]
        )
        cache[key] = {"steps": list(fallbacks.MAYA_MISSION)}

    cache[calls._key("builder_title", calls._profile_fingerprint(ALEX))] = ALEX["builder_title"]
    for p in ROSTER:
        cache[calls._key("builder_title", calls._profile_fingerprint(p))] = p["builder_title"]

    store._write(store.CACHE_PATH, cache)
    print(f"wrote {len(ROSTER)} profiles and {len(cache)} cache entries")


if __name__ == "__main__":
    main()
