# LinkUp

**Less LinkedIn. More LinkUp.** — Match. Build. Ship.

LinkUp matches student builders on complementary skills and shared obsessions,
explains why two people should build together, proposes three projects for the
pair, and then hands them a **First 30 Minutes** mission with a shared checklist.
The product doesn't end at the match. It ends when two strangers have done
something together.

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

The Anthropic key is optional. Without it the app runs entirely on the
pre-generated cache in `backend/data/ai_cache.json` plus the deterministic
fallbacks, and the demo path is identical. To use live Claude calls:

```bash
cp backend/.env.example backend/.env && export ANTHROPIC_API_KEY=sk-ant-...
```

## The demo path

1. **Get started** → **Demo fill** (top right) → **Find my people**
2. Watch the builder title appear → **Continue**
3. Card 1 — Dev Malhotra, 96% → **Pass**
4. Card 2 — Sofia Marchetti, 93% → **Pass**
5. Card 3 — Maya Okafor, 92% → tap **Why us?** → read it → **Link** (green heart)
6. Match screen: why you two, skill-fit bars, three ideas → tap **Loop Swap** (a weekend)
7. Mission screen: tick step 1, send a message, read Maya's reply

The point of steps 3–5: the two cards above Maya score *higher* and are wrong
anyway. Dev wants an audience, Sofia wants to teach theory. Maya wants the exact
thing Alex wants. The number gets you close; the text closes it.

## How it works

**Scoring** (`backend/scoring.py`) — five dimensions, weighted
`0.35 skills + 0.30 passion + 0.20 style + 0.10 commitment + 0.05 experience`.

- `skills` is pure set math: how much of what you're missing they have, and how
  much of what they're missing you have, weighted by level. No AI.
- `commitment` and `experience` are lookup tables. Commitment below 50 is a soft
  filter — those people sink to the bottom of the stack, they're never hidden.
- `passion` and `style` are the only AI numbers, scored for every candidate in
  **one** Claude call and cached against a hash of your profile.

**The six Claude calls** live in `backend/ai/calls.py`. Every one is
`cache → API → fallback`, so a dead key or a dead network changes nothing the
audience can see. The fallbacks (`backend/ai/fallbacks.py`) are real code, not
error strings: passion falls back to a histogram intersection over topic
clusters, style to a working-pace feature distance.

**Storage** is three JSON files in `backend/data/`. No database, no auth, no
websockets. `POST /reset` wipes you and your matches and keeps the seed roster,
so the demo can be run again immediately.

## Layout

```
backend/
  main.py          FastAPI routes
  scoring.py       the match algorithm
  taxonomy.py      the 24 skills
  ai/client.py     MODEL lives here, and nowhere else
  ai/calls.py      the six calls, each cache -> API -> fallback
  ai/fallbacks.py  what runs when there is no key
  seed/roster.py   26 hand-written profiles
  seed/generate.py writes seed_profiles.json + primes the cache
  data/            seed_profiles.json and ai_cache.json are committed
  tests/           pytest
  smoke.sh         walks the whole API demo path, exits 0 or 1
frontend/
  src/screens/     Landing, Onboarding, Swipe, Match, Mission, Matches, Me
  src/components/  cards, chips, skill bars, nav
  src/assets/avatars/  six inline SVG avatars
```

## Checks

```bash
cd backend && .venv/bin/python -m pytest tests -q
```

```bash
cd frontend && npm run build
```

```bash
cd backend && ./smoke.sh
```

`smoke.sh` needs the backend running. It asserts, among other things, that Maya
lands at stack position 3 or 4 — the demo depends on it, so it is a test.

## Regenerating seeds

The roster and the primed cache are committed. You only need this if you change
`seed/roster.py`:

```bash
cd backend && .venv/bin/python -m seed.generate
```

Add `--live` to score the demo user against the roster with Claude instead of
the deterministic path (requires `ANTHROPIC_API_KEY`).
