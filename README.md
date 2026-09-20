# LinkedUp

**Less LinkedIn. More LinkedUp.**

LinkedIn tells you what people have done. Social media shows what people are
doing. LinkedUp understands who you should be doing it with.

A social network for people who build things. Underneath: scoring that
understands what people know, what they're missing, what they want to build and
who complements whom; a feed that says *why* you should know someone; and a
teammate who helps two strangers start talking and building.

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

`MODEL_API_KEY` goes in `backend/.env` (copy `.env.example`). The backend reads
it at startup; it never reaches the browser, the logs, or a response. Chat and
post inference run on the Meta Model API (`muse-spark-1.3`, falling back to
`muse-spark-1.2`).

- **Chat needs it.** Without a key the thread shows a setup note instead of a
  reply — never a canned line.
- Everything else — Home, Discover, profiles, "Why you two", ideas, missions,
  "Find our missing piece" — runs from the committed cache and deterministic
  scoring. No page depends on a live model call.

To run keyless on purpose: `MODEL_API_KEY= .venv/bin/python -m uvicorn main:app --port 8000`.

## The demo (2–3 minutes)

1. **Landing** → **Get started** → **Demo fill** → **Find my people** → **Go to Home**
2. **Home.** Amara's post — *"looking for someone who actually enjoys frontend
   because I absolutely do not."* — is in the first three, with a card under it:
   *"Amara wants frontend help for a civic-tech project. You specialize in
   frontend, and you both care about tools for cities."*
3. **View profile** → Amara: currently building Late Bus, skills, looking for,
   posts. **Why you two** → explanation + skill bars.
4. **Connect** → match moment → **What you could build** → **Block Board** →
   **Start building together**.
5. Thread: send **"hey"** → typing → a greeting-first reply. Send **"yeah what
   do you think we should build first?"** → a reply that uses the history,
   Block Board and the frontend/backend split. Point at *First 30 minutes*.
6. Tap **Block Board** in the thread header → project page → **Find our
   missing piece** → Sarah Chen, with the reason.
7. **Create** (+) → *Looking for teammate* → post an ask → it lands on top of
   Home with a card under it.

**Reset between judges:** *Reset demo* under *Get started* on the landing page,
*Reset the demo* on your Profile, or hold the LinkedUp wordmark on Quick
discover. All clear you, your matches, connections and anything you posted, and
keep the seeds. Same thing from a shell:

```bash
curl -X POST http://localhost:8000/reset
```

## How it works

**Scoring** (`backend/scoring.py`) — `0.35 skills + 0.30 passion + 0.20 style +
0.10 commitment + 0.05 experience`. Skills is pure set math on what you're
missing vs what they have, both ways. Passion and style come from one cached
model call with a deterministic heuristic behind it. Nothing is hand-set:
Amara is rank 1 because the honest numbers put her there, and
`tests/test_scoring.py` prints the top five.

**Suggestions** (`GET /feed`, `/people`, right rail) — from the same scored
stack. Reasons are two sentences built only from real profile, post and project
fields (`ai/fallbacks.py: suggestion_reason`). No model call on Home, ever.

**Missing piece** (`GET /projects/{id}/missing-piece`) — coverage of the
project's declared needs, level-weighted, plus how much the candidate's own
ambition overlaps the project. Deterministic; nobody is named.

**Live model calls**, and only these: "Why you two" (cached after the first
call), project ideas and the mission (cached for the demo pair), post inference
on Create, and the teammate chat. Chat sends both profiles, the match
explanation, the chosen project with both roles, the mission and its state, and
the whole conversation on every message; failures keep your message and offer
Retry.

**Storage** is JSON in `backend/data/`. Seeds are committed; `profiles.json`,
`matches.json`, `connections.json`, `user_posts.json` and `user_projects.json`
are runtime and cleared by reset. Tests run in a temp copy and never touch it.

## Layout

```
backend/
  main.py          routes: session, feed, people, projects, threads, connect, posts, match/chat, reset
  scoring.py       the match algorithm
  ai/client.py     MODEL and the provider live here, and nowhere else
  ai/calls.py      cached calls, post inference, the live teammate chat
  ai/fallbacks.py  deterministic reasons, inference and stand-ins
  seed/roster.py   29 hand-written profiles + the Demo fill user
  data/            seed_profiles, posts, projects, threads, ai_cache (committed)
  tests/           pytest, isolated from data/
  smoke.sh         walks the whole API demo path, exits 0 or 1
frontend/src/
  App.tsx          sidebar + column + rail on desktop, bottom nav on mobile
  screens/         Home, Discover, People, Project, Messages, Thread, Mission, Match, Swipe, Onboarding, Landing
  components/      SuggestedConnection, PostCard, CreateSheet, SkillBars, IdeaCard, Sidebar, RightRail, BottomNav
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
