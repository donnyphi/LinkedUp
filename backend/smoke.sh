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
curl -sf "$API/health" | j "['ok']" | grep -q True || fail "backend is not up at $API"

step "1. reset"
curl -sf -X POST "$API/reset" >/dev/null

step "2. onboard as the demo user"
PROFILE=$(curl -sf -X POST "$API/profile" -H 'content-type: application/json' -d '{
  "name": "Alex Chen",
  "school": "MIT",
  "avatar": "nova",
  "skills": [{"name":"Backend","level":"expert"},{"name":"ML / AI","level":"solid"},{"name":"Data","level":"solid"}],
  "missing": ["Product design", "Visual design", "Frontend"],
  "want_to_build": "Something that helps people who make music discover collaborators and finish songs instead of hoarding 200 unfinished projects.",
  "commitment": "side_project",
  "experience": "shipped",
  "team_size": "2",
  "prompts": {
    "hackathon_person": "...who writes the whole backend before anyone'"'"'s agreed on what we'"'"'re building",
    "toxic_trait": "I'"'"'ll say '"'"'that'"'"'s easy'"'"' and then disappear for 6 hours",
    "excited_about": "audio DSP and anything with a good API"
  },
  "github": "https://github.com/alexchen"
}')
echo "   title: $(echo "$PROFILE" | j "['profile']['builder_title']")"

step "3. stack order"
STACK=$(curl -sf "$API/stack")
echo "$STACK" | python3 -c "
import sys, json
rows = json.load(sys.stdin)['stack']
for i, r in enumerate(rows[:4], 1):
    print('   %d. %-18s %s' % (i, r['profile']['name'], r['hook']))
pos = next(i for i, r in enumerate(rows, 1) if r['profile']['id'] == 'p_maya')
assert pos in (3, 4), 'Maya is at position %d, expected 3 or 4' % pos
assert len(rows) == 26, 'expected 26 candidates, got %d' % len(rows)
print('   Maya at position', pos)
" || fail "stack order is wrong"

step "4. pass on the first two"
for ID in $(echo "$STACK" | python3 -c "
import sys, json
print(' '.join(r['profile']['id'] for r in json.load(sys.stdin)['stack'][:2]))"); do
  curl -sf -X POST "$API/swipe" -H 'content-type: application/json' \
    -d "{\"other_id\":\"$ID\",\"dir\":\"left\"}" >/dev/null
  echo "   passed on $ID"
done

step "5. link with Maya"
MATCH=$(curl -sf -X POST "$API/swipe" -H 'content-type: application/json' \
  -d '{"other_id":"p_maya","dir":"right"}')
MID=$(echo "$MATCH" | j "['match']['id']")
echo "$MATCH" | python3 -c "
import sys, json
m = json.load(sys.stdin)['match']
assert m['explanation'].strip(), 'no explanation'
assert len(m['ideas']) == 3, 'expected 3 ideas'
assert any(i['difficulty'] == 'weekend' for i in m['ideas']), 'no weekend idea'
assert len(m['skill_bars']) == 5, 'expected 5 skill bars'
print('   %d%% ·' % m['score']['overall'], m['explanation'][:70] + '...')
for i in m['ideas']:
    print('   - %-12s [%s] %s' % (i['name'], i['difficulty'], i['one_liner']))
" || fail "match payload is incomplete"

step "6. pick the weekend idea"
IDX=$(echo "$MATCH" | python3 -c "
import sys, json
ideas = json.load(sys.stdin)['match']['ideas']
print(next(i for i, x in enumerate(ideas) if x['difficulty'] == 'weekend'))")
curl -sf -X POST "$API/match/$MID/idea" -H 'content-type: application/json' \
  -d "{\"index\":$IDX}" | python3 -c "
import sys, json
m = json.load(sys.stdin)
steps = m['mission']['steps']
assert len(steps) == 3, 'expected 3 mission steps'
assert m['mission']['done'] == [False, False, False]
for s in steps: print('   [ ]', s)
" || fail "mission was not generated"

step "7. tick step 1"
curl -sf -X POST "$API/match/$MID/mission/toggle" -H 'content-type: application/json' \
  -d '{"step":0}' | j "['mission']['done']" | grep -q True || fail "toggle did not stick"
echo "   step 1 done"

step "8. send a message"
curl -sf -X POST "$API/match/$MID/chat" -H 'content-type: application/json' \
  -d '{"text":"want to build the loop thing this weekend?"}' | python3 -c "
import sys, json
chat = json.load(sys.stdin)['chat']
assert len(chat) == 2, 'expected a reply'
assert chat[1]['from'] == 'them' and chat[1]['text'].strip()
print('   me:   ', chat[0]['text'])
print('   maya: ', chat[1]['text'])
" || fail "chat did not come back"

step "9. matches list"
curl -sf "$API/matches" | python3 -c "
import sys, json
ms = json.load(sys.stdin)['matches']
assert len(ms) == 1, 'expected exactly 1 match, got %d' % len(ms)
print('   1 match saved:', ms[0]['other']['name'])
" || fail "match was not saved"

printf '\n\033[32mSMOKE PASSED\033[0m - the whole demo path works.\n'
