#!/usr/bin/env bash
# Walks the whole demo path against a running backend. Exits 0 only if it works.
#   ./smoke.sh            # expects http://localhost:8000
#   API=http://host ./smoke.sh
set -euo pipefail

API="${API:-http://localhost:8000}"
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\033[31mFAIL: %s\033[0m\n' "$*" >&2; exit 1; }
j() { python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1"; }

step "0. health"
HEALTH=$(curl -sf "$API/health") || fail "backend is not up at $API"
LIVE=$(echo "$HEALTH" | j "['live_ai']")
echo "   live_ai: $LIVE"

step "1. reset"
curl -sf -X POST "$API/reset" >/dev/null

step "2. onboard as the demo user"
PROFILE=$(curl -sf -X POST "$API/profile" -H 'content-type: application/json' -d '{
  "name": "Alex Chen",
  "school": "MIT",
  "avatar": "nova",
  "skills": [{"name":"Frontend","level":"expert"},{"name":"Product design","level":"solid"},{"name":"Visual design","level":"solid"}],
  "missing": ["Backend", "Data"],
  "want_to_build": "Tools for cities and campuses. Starting with something that shows a neighborhood what'"'"'s actually happening on their block, so neighbors stop relying on one chaotic group chat.",
  "commitment": "side_project",
  "experience": "shipped",
  "team_size": "2",
  "prompts": {
    "hackathon_person": "...who has the UI running on a real phone before the backend exists",
    "toxic_trait": "I'"'"'ll redesign the empty state instead of fixing the bug",
    "excited_about": "public data that nobody can read, and making it readable"
  },
  "github": "https://github.com/alexchen"
}')
echo "   title: $(echo "$PROFILE" | j "['profile']['builder_title']")"

step "3. stack order"
STACK=$(curl -sf "$API/stack")
echo "$STACK" | python3 -c "
import sys, json
rows = json.load(sys.stdin)['stack']
for i, r in enumerate(rows[:5], 1):
    print('   %d. %-18s %3d%%  %s' % (i, r['profile']['name'], r['score']['overall'], r['fit_label']))
pos = next(i for i, r in enumerate(rows, 1) if r['profile']['id'] == 'p_amara')
am = rows[pos - 1]
assert pos <= 3, 'Amara is at position %d, expected 1-3' % pos
assert am['score']['overall'] >= 80, 'Amara scores %d, expected 80+' % am['score']['overall']
assert len(rows) == 29, 'expected 29 candidates, got %d' % len(rows)
print('   Amara at position %d with %d%%' % (pos, am['score']['overall']))
" || fail "stack order is wrong"

step "3b. home feed"
curl -sf "$API/feed" | python3 -c "
import sys, json
items = json.load(sys.stdin)['items']
posts = [i for i in items if i['kind'] == 'post']
idx = next(i for i, p in enumerate(posts) if p['author_id'] == 'p_amara' and p['type'] == 'looking_for')
assert idx < 3, 'Amara looking-for post is at %d' % idx
card = items[items.index(posts[idx]) + 1]
assert card['kind'] == 'suggestion' and card['profile']['id'] == 'p_amara', 'no card under her post'
print('   %d posts, %d suggestion cards' % (len(posts), sum(1 for i in items if i['kind'] == 'suggestion')))
print('   card:', card['reason'])
" || fail "feed is wrong"

step "4. connect with Amara"
MATCH=$(curl -sf -X POST "$API/connect" -H 'content-type: application/json' \
  -d '{"other_id":"p_amara"}')
MID=$(echo "$MATCH" | j "['match']['id']")
echo "$MATCH" | python3 -c "
import sys, json
m = json.load(sys.stdin)['match']
assert m['explanation'].strip(), 'no explanation'
assert len(m['ideas']) == 3, 'expected 3 ideas'
assert any(i['difficulty'] == 'weekend' for i in m['ideas']), 'no weekend idea'
assert any(i['name'] == 'Block Board' for i in m['ideas']), 'Block Board missing'
assert len(m['skill_bars']) >= 3, 'expected 3+ skill bars'
print('   %d%% ·' % m['score']['overall'], m['explanation'][:70] + '...')
for i in m['ideas']:
    print('   - %-13s [%s] %s' % (i['name'], i['difficulty'], i['one_liner']))
" || fail "match payload is incomplete"

step "5. pick Block Board"
IDX=$(echo "$MATCH" | python3 -c "
import sys, json
ideas = json.load(sys.stdin)['match']['ideas']
print(next(i for i, x in enumerate(ideas) if x['name'] == 'Block Board'))")
curl -sf -X POST "$API/match/$MID/idea" -H 'content-type: application/json' \
  -d "{\"index\":$IDX}" | python3 -c "
import sys, json
m = json.load(sys.stdin)
steps = m['mission']['steps']
assert len(steps) == 3, 'expected 3 mission steps'
assert m['mission']['done'] == [False, False, False]
for s in steps: print('   [ ]', s)
" || fail "mission was not generated"

step "6. tick step 1"
curl -sf -X POST "$API/match/$MID/mission/toggle" -H 'content-type: application/json' \
  -d '{"step":0}' | j "['mission']['done']" | grep -q True || fail "toggle did not stick"
echo "   step 1 done"

step "7. send 'hey'"
curl -sf -X POST "$API/match/$MID/chat" -H 'content-type: application/json' \
  -d '{"text":"hey"}' | LIVE="$LIVE" python3 -c "
import sys, json, os
r = json.load(sys.stdin)
chat = r['match']['chat']
assert chat[0]['from'] == 'me' and chat[0]['text'] == 'hey', 'user message lost'
if os.environ['LIVE'] == 'True':
    assert r['status'] in ('ok', 'error'), r['status']
    if r['status'] == 'ok':
        assert chat[-1]['from'] == 'them' and chat[-1]['text'].strip(), 'no reply'
        print('   amara:', chat[-1]['text'])
    else:
        print('   (model call failed; message kept, retry available)')
        assert r['match']['pending_reply'] is True
else:
    assert r['status'] == 'no_key', r['status']
    assert chat[-1]['from'] == 'system', 'expected a system note without a key'
    print('   system note:', chat[-1]['text'])
" || fail "chat did not behave"

step "8. history survives a re-read"
curl -sf "$API/match/$MID" | python3 -c "
import sys, json
m = json.load(sys.stdin)
assert len(m['chat']) >= 1 and m['chat'][0]['text'] == 'hey'
print('   %d message(s) persisted' % len(m['chat']))
" || fail "chat history was not persisted"

step "9. matches list"
curl -sf "$API/matches" | python3 -c "
import sys, json
ms = json.load(sys.stdin)['matches']
assert len(ms) == 1, 'expected exactly 1 match, got %d' % len(ms)
print('   1 match saved:', ms[0]['other']['name'])
" || fail "match was not saved"

printf '\n\033[32mSMOKE PASSED\033[0m - the whole demo path works.\n'
