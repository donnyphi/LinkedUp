# LinkedUp

**Less LinkedIn. More LinkedUp.** — Match. Build. Ship.

Tinder for people you want to build with. LinkedUp matches student builders on
complementary skills and a shared obsession, explains why two people fit, hands
them three things to build, and then a real AI teammate helps them start talking
and working in the first thirty minutes. Not recruiting.

Built for HackMIT 2026, Meta track: *Bringing People Closer Together with AI*.

---

## Run it

Two terminals, from a fresh clone.

**Terminal 1 — backend** (http://localhost:8000)

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python -m uvicorn main:app --port 8000
```

**Terminal 2 — frontend** (http://localhost:5173)

```bash
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173**.

### The key

`MODEL_API_KEY` lives in `backend/.env` (or the environment), is read by the backend only, and never reaches the browser. Chat runs on the Meta Model API (`muse-spark-1.3`).

- **Chat needs it.** The teammate's replies are live model calls. Without a key
  the chat shows a setup note instead of a reply — it never falls back to canned
  lines, because canned lines were the bug.
- Everything else — matching, the match explanation, the three ideas, the
  mission — works offline from `backend/data/ai_cache.json` plus deterministic
  fallbacks, so the demo path is stable with or without it.

## The demo (2–3 minutes)

1. **Landing** → **Get started**
2. **Demo fill** (top right of step 1). It fills all three stages and lands on
   step 3 → **Find my people**
3. Profile confirmation: what you bring / what you're missing / what you want
   to build → **Find my people**
4. **Discovery.** Amara Boateng is the first card, "Strong complement — They
   bring Data and Backend. You bring Frontend and Product design." → **Connect**
5. Match moment → match screen: why you two, four paired skill bars, three ideas
6. Tap **Block Board** → **Start building together**
7. Mission/chat: send **"hey"** → typing → a greeting-first reply. Send **"yeah
   what do you think we should build first?"** → a reply that uses the project
   and the frontend/backend split. Point at *First 30 minutes*.

**Reset between judges:** the *Reset demo* link under *Get started* on the
landing page, *Reset the demo* on the Profile tab, or hold the LinkedUp wordmark
on the discovery screen for a second. All three wipe you and your matches and
keep the 26 seed builders. Same thing from a shell:

```bash
curl -X POST http://localhost:8000/reset
```

## How it works

**Scoring** (`backend/scoring.py`) — five dimensions, weighted
`0.35 skills + 0.30 passion + 0.20 style + 0.10 commitment + 0.05 experience`.

- `skills` is pure set math: what you're missing that they have, and what
  they're missing that you have, weighted by level. No AI.
- `commitment` and `experience` are lookup tables. Commitment below 50 is a soft
  filter — those people sink to the bottom of the stack, they're never hidden.
- `passion` and `style` are scored for every candidate in one model call,
  cached against a hash of your profile, with a deterministic heuristic behind
  it. Nothing is hand-set for the demo: Amara lands first because the honest
  numbers put her there, and `tests/test_scoring.py` prints the top five to
  prove it.

**Chat** (`backend/ai/calls.py: teammate_reply`) — one call per message, never
cached, `muse-spark-1.3` on the Meta Model API (falls back to `muse-spark-1.2`), `max_tokens` 150,
temperature 0.8. Every request carries both profiles, the match explanation, the
chosen project with both roles, the mission steps and which are done, and the
whole conversation. Replies are stripped of quotes and a `Amara:` prefix; an
empty reply is retried once. History is stored on the match, so a refresh loses
nothing. A failed call keeps your message and offers *Retry*.

**Storage** is JSON files in `backend/data/`. No database, no auth.

## Layout

```
backend/
  main.py          FastAPI routes (incl. /session, /match/{id}/chat, /chat/retry, /reset)
  scoring.py       the match algorithm
  ai/client.py     MODEL lives here, and nowhere else
  ai/calls.py      cached calls + the live teammate chat
  ai/fallbacks.py  deterministic stand-ins for the cached calls
  seed/roster.py   26 hand-written profiles + the Demo fill user
  seed/generate.py writes seed_profiles.json + primes the cache
  tests/           pytest (runs in a temp data dir, never touches the demo)
  smoke.sh         walks the whole API demo path, exits 0 or 1
frontend/
  src/index.css    brand tokens (pink/red primary, no purple anywhere)
  src/screens/     Landing, Onboarding (3 stages), Swipe, Match, Mission, Matches, Me
  src/components/  Button, Card, IdeaCard, SkillBars, BottomNav, Loading
```

## Checks

```bash
cd backend && .venv/bin/python -m pytest tests -q -s
```

```bash
cd frontend && npm run build
```

```bash
cd backend && ./smoke.sh
```

`smoke.sh` needs the backend running. With a key it expects a real reply (or a
clean failure with the message kept); without one it expects the setup note.

## Regenerating seeds

Only needed if you change `seed/roster.py`. Deterministic, no network:

```bash
cd backend && .venv/bin/python -m seed.generate
```

`--live` scores the demo user with the model instead (needs the key).
