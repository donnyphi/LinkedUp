"""Writes data/seed_profiles.json and primes data/ai_cache.json.

Run once, commit the output. Nothing here runs at request time and nothing
here touches the network unless you pass --live.

    python -m seed.generate          # deterministic, no network
    python -m seed.generate --live   # score the demo user with the model instead

Scores are never hand-set. The demo user's passion/style numbers come from the
same heuristic that runs for any user when there is no key.
"""

import sys

import store
from ai import calls, client, fallbacks
from seed.roster import DEMO_REASONS, DEMO_USER, ROSTER


def main() -> None:
    live = "--live" in sys.argv and client.have_key()

    store._write(store.SEEDS_PATH, ROSTER)
    store._write(store.PROFILES_PATH, ROSTER)
    store._write(store.MATCHES_PATH, [])
    store.set_demo_active(False)

    cache = {}
    ids = sorted(p["id"] for p in ROSTER)
    scores = calls.score_pairs(DEMO_USER, ROSTER) if live else fallbacks.score_pairs(DEMO_USER, ROSTER)
    cache[calls._key("score_pairs", calls._profile_fingerprint(DEMO_USER), ids)] = scores

    # The demo pair's match content is hand-written so the demo is stable offline.
    amara = next(p for p in ROSTER if p["id"] == fallbacks.AMARA_ID)
    me_fp, am_fp = calls._profile_fingerprint(DEMO_USER), calls._profile_fingerprint(amara)
    cache[calls._key("explain", me_fp, am_fp)] = fallbacks.AMARA_EXPLANATION
    for pid, text in DEMO_REASONS.items():
        other = next(p for p in ROSTER if p["id"] == pid)
        cache[calls._key("explain", me_fp, calls._profile_fingerprint(other))] = text
    ideas = [dict(i) for i in fallbacks.AMARA_IDEAS]
    cache[calls._key("ideas", me_fp, am_fp)] = ideas
    for idea in ideas:
        cache[calls._key("mission", me_fp, am_fp, idea["name"])] = {"steps": list(fallbacks.AMARA_MISSION)}

    cache[calls._key("builder_title", me_fp)] = DEMO_USER["builder_title"]
    for p in ROSTER:
        cache[calls._key("builder_title", calls._profile_fingerprint(p))] = p["builder_title"]

    store._write(store.CACHE_PATH, cache)
    print(f"wrote {len(ROSTER)} profiles and {len(cache)} cache entries ({'live' if live else 'deterministic'} scores)")


if __name__ == "__main__":
    main()
