#!/usr/bin/env bash
# End-to-end smoke test for CareerMaxing.
# Exercises auth, profile, scan, opportunities, checklist, emails, integrations.
set -u
BASE="${BASE:-http://localhost:3000}"
COOKIE_JAR="$(mktemp -t cm_cookies.XXXXXX)"
EMAIL="e2e_$(date +%s)@careermaxing.test"
NAME="E2E Test User"
PW="superSecret123"

PASS=0
FAIL=0
FAILURES=()

ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ✗ $1"; FAIL=$((FAIL+1)); FAILURES+=("$1"); }
step() { echo
        echo "=== $1 ==="; }

# Reusable curl helper: prints body and exit code
post()  { curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE$1" -H "Content-Type: application/json" -d "$2" -w "\n__STATUS__%{http_code}"; }
postf() { curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE$1" -H "Content-Type: application/x-www-form-urlencoded" -d "$2" -w "\n__STATUS__%{http_code}"; }
get()   { curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$BASE$1" -w "\n__STATUS__%{http_code}"; }
patch() { curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X PATCH "$BASE$1" -H "Content-Type: application/json" -d "$2" -w "\n__STATUS__%{http_code}"; }

body() { echo "$1" | sed '$d'; }
status() { echo "$1" | tail -n1 | sed 's/__STATUS__//'; }
jval() { python3 -c "import sys,json; d=json.loads(sys.stdin.read()); k='$1'.split('.'); v=d
for kk in k:
  v = v.get(kk) if isinstance(v, dict) else (v[int(kk)] if isinstance(v, list) else None)
print(v if v is not None else '')" 2>/dev/null; }

step "1. Public routes"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/");           [ "$R" = "200" ] && ok "GET / → 200" || bad "GET / → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/login");      [ "$R" = "200" ] && ok "GET /login → 200" || bad "GET /login → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/signup");     [ "$R" = "200" ] && ok "GET /signup → 200" || bad "GET /signup → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/forgot-password"); [ "$R" = "200" ] && ok "GET /forgot-password → 200" || bad "GET /forgot-password → $R"

step "2. Middleware route protection (unauthenticated)"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/dashboard"); [ "$R" = "307" ] && ok "GET /dashboard → 307" || bad "GET /dashboard → $R (expected 307)"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/jobs");      [ "$R" = "307" ] && ok "GET /jobs → 307" || bad "GET /jobs → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/events");    [ "$R" = "307" ] && ok "GET /events → 307" || bad "GET /events → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/learning");  [ "$R" = "307" ] && ok "GET /learning → 307" || bad "GET /learning → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/inbox");     [ "$R" = "307" ] && ok "GET /inbox → 307" || bad "GET /inbox → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/checklist"); [ "$R" = "307" ] && ok "GET /checklist → 307" || bad "GET /checklist → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/onboarding"); [ "$R" = "307" ] && ok "GET /onboarding → 307" || bad "GET /onboarding → $R"

step "3. API auth gate"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/profile"); [ "$R" = "401" ] && ok "/api/profile → 401" || bad "/api/profile → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/dashboard"); [ "$R" = "401" ] && ok "/api/dashboard → 401" || bad "/api/dashboard → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/scan"); [ "$R" = "401" ] && ok "POST /api/scan → 401" || bad "POST /api/scan → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/opportunities?kind=job"); [ "$R" = "401" ] && ok "/api/opportunities → 401" || bad "/api/opportunities → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/checklist"); [ "$R" = "401" ] && ok "/api/checklist → 401" || bad "/api/checklist → $R"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/emails"); [ "$R" = "401" ] && ok "/api/emails → 401" || bad "/api/emails → $R"

step "4. Register"
RAW=$(post /api/auth/register "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PW\"}")
S=$(status "$RAW"); B=$(body "$RAW")
[ "$S" = "200" ] && ok "register $EMAIL → 200" || bad "register → $S: $B"
USER_ID=$(echo "$B" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)
[ -n "$USER_ID" ] && ok "user.id returned: $USER_ID" || bad "user.id missing"

# Duplicate
RAW=$(post /api/auth/register "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PW\"}")
S=$(status "$RAW")
[ "$S" = "409" ] && ok "duplicate register → 409" || bad "duplicate register → $S"

# Invalid input
RAW=$(post /api/auth/register "{\"name\":\"X\",\"email\":\"bad\",\"password\":\"short\"}")
S=$(status "$RAW")
[ "$S" = "400" ] && ok "invalid register → 400" || bad "invalid register → $S"

step "5. Login (NextAuth credentials)"
CSRF=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE/api/auth/csrf" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
[ -n "$CSRF" ] && ok "csrf token fetched" || bad "csrf missing"

RAW=$(postf /api/auth/callback/credentials "csrfToken=$CSRF&email=$EMAIL&password=$PW&redirect=false&json=true")
S=$(status "$RAW")
[ "$S" = "200" ] && ok "login → 200" || bad "login → $S: $(body "$RAW")"

# Wrong password
WRONG=$(curl -s -c /tmp/cm_wrong.txt "$BASE/api/auth/csrf" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
RAW=$(curl -s -b /tmp/cm_wrong.txt -c /tmp/cm_wrong.txt -X POST "$BASE/api/auth/callback/credentials" -H "Content-Type: application/x-www-form-urlencoded" -d "csrfToken=$WRONG&email=$EMAIL&password=WRONGpw&redirect=false&json=true" -w "\n__STATUS__%{http_code}")
S=$(status "$RAW"); B=$(body "$RAW")
# NextAuth returns 200 with error url on bad creds
if echo "$B" | grep -q "CredentialsSignin\|error"; then ok "wrong password rejected"
else bad "wrong password unexpectedly accepted: $B"; fi
SESS=$(curl -s -b /tmp/cm_wrong.txt "$BASE/api/auth/session")
[ "$SESS" = "{}" ] && ok "no session for wrong creds" || bad "session leaked: $SESS"

step "6. Session"
RAW=$(get /api/auth/session)
S=$(status "$RAW"); B=$(body "$RAW")
[ "$S" = "200" ] && ok "GET /api/auth/session → 200" || bad "session → $S"
SID=$(echo "$B" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('id',''))" 2>/dev/null)
[ "$SID" = "$USER_ID" ] && ok "session.user.id matches register: $SID" || bad "session.user.id mismatch ($SID vs $USER_ID)"

step "7. Profile create/update"
PROFILE='{"name":"E2E User","school":"University of Calgary","level":"intermediate","primaryDomain":"Agentic AI","locations":["Calgary","Remote"],"opportunityTypes":["jobs","hackathons","courses"],"weeklyHours":10,"schedule":[{"day":"Mon","startHour":9,"endHour":11,"label":"AI Class"}],"skills":["Python","PyTorch","NextJS"],"careerGoals":["land summer 2026 AI internship"]}'
RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X PUT "$BASE/api/profile" -H "Content-Type: application/json" -d "$PROFILE" -w "\n__STATUS__%{http_code}")
S=$(status "$RAW"); B=$(body "$RAW")
[ "$S" = "200" ] && ok "PUT /api/profile → 200" || bad "PUT /api/profile → $S: $B"

RAW=$(get /api/profile)
S=$(status "$RAW"); B=$(body "$RAW")
[ "$S" = "200" ] && ok "GET /api/profile → 200" || bad "GET /api/profile → $S"
echo "$B" | grep -q "Agentic AI" && ok "profile persists primaryDomain" || bad "profile missing primaryDomain"
echo "$B" | grep -q "AI Class" && ok "profile persists schedule slot" || bad "profile missing schedule slot"

step "8. Integrations status"
RAW=$(curl -s "$BASE/api/integrations" -w "\n__STATUS__%{http_code}")
S=$(status "$RAW"); B=$(body "$RAW")
[ "$S" = "200" ] && ok "GET /api/integrations → 200" || bad "GET /api/integrations → $S"
echo "  body: $B"

step "9. Scan (live Remotive + Devpost)"
RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE/api/scan" --max-time 90 -w "\n__STATUS__%{http_code}")
S=$(status "$RAW"); B=$(body "$RAW")
[ "$S" = "200" ] && ok "POST /api/scan → 200" || bad "POST /api/scan → $S: $B"
echo "  scan result: $B"

step "10. Opportunities"
for kind in job event course; do
  RAW=$(get "/api/opportunities?kind=$kind")
  S=$(status "$RAW"); B=$(body "$RAW")
  COUNT=$(echo "$B" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['items']))" 2>/dev/null || echo 0)
  [ "$S" = "200" ] && ok "GET /api/opportunities?kind=$kind → 200 (count=$COUNT)" || bad "kind=$kind → $S"
  [ "$COUNT" -gt 0 ] && ok "kind=$kind returned items" || bad "kind=$kind returned ZERO items"
  if [ "$kind" = "job" ]; then
    JOB_ID=$(echo "$B" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['items'][0]['_id'] if d['items'] else '')" 2>/dev/null)
  fi
done

step "11. Opportunity actions (follow → builds tasks)"
if [ -n "$JOB_ID" ]; then
  RAW=$(post "/api/opportunities/$JOB_ID/action" '{"action":"follow","intensity":"standard"}')
  S=$(status "$RAW"); B=$(body "$RAW")
  [ "$S" = "200" ] && ok "POST /api/opportunities/$JOB_ID/action follow → 200" || bad "follow → $S: $B"
  TASKS=$(echo "$B" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tasksAdded',0))" 2>/dev/null)
  [ "$TASKS" -gt 0 ] 2>/dev/null && ok "tasks generated: $TASKS" || bad "no tasks generated"
else
  bad "no JOB_ID to act on"
fi

step "12. Checklist"
RAW=$(get /api/checklist)
S=$(status "$RAW"); B=$(body "$RAW")
[ "$S" = "200" ] && ok "GET /api/checklist → 200" || bad "checklist → $S"
TC=$(echo "$B" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['tasks']))" 2>/dev/null)
SC=$(echo "$B" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['schedule']))" 2>/dev/null)
[ "$TC" -gt 0 ] 2>/dev/null && ok "checklist has $TC tasks" || bad "checklist has no tasks"
[ "$SC" -gt 0 ] 2>/dev/null && ok "checklist returns $SC schedule slot(s)" || bad "checklist missing schedule"

# Toggle one task
TASK_ID=$(echo "$B" | python3 -c "import sys,json; print(json.load(sys.stdin)['tasks'][0]['_id'])" 2>/dev/null)
RAW=$(patch "/api/tasks/$TASK_ID" '{"status":"done"}')
S=$(status "$RAW")
[ "$S" = "200" ] && ok "PATCH /api/tasks/$TASK_ID → 200" || bad "patch task → $S"

step "13. Dashboard"
RAW=$(get /api/dashboard)
S=$(status "$RAW"); B=$(body "$RAW")
[ "$S" = "200" ] && ok "GET /api/dashboard → 200" || bad "dashboard → $S"
CMS=$(echo "$B" | python3 -c "import sys,json; print(json.load(sys.stdin).get('careerMaxingScore',-1))" 2>/dev/null)
[ "$CMS" -ge 0 ] 2>/dev/null && ok "careerMaxingScore present: $CMS" || bad "careerMaxingScore missing"

step "14. Email scan (manual paste)"
RAW=$(post /api/email/scan '{"subject":"Interview invite - AI Engineer","sender":"recruiter@openai.com","body":"Hi, we would like to invite you for an interview next Tuesday at 2pm for the AI Engineer role."}')
S=$(status "$RAW"); B=$(body "$RAW")
[ "$S" = "200" ] && ok "POST /api/email/scan → 200" || bad "email scan → $S: $B"
EMAIL_ID=$(echo "$B" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('email',{}).get('_id',''))" 2>/dev/null)
[ -n "$EMAIL_ID" ] && ok "email created: $EMAIL_ID" || bad "no email id"

RAW=$(get /api/emails)
S=$(status "$RAW"); B=$(body "$RAW")
EC=$(echo "$B" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['emails']))" 2>/dev/null)
[ "$EC" -gt 0 ] 2>/dev/null && ok "GET /api/emails → $EC email(s)" || bad "emails list empty"

if [ -n "$EMAIL_ID" ]; then
  RAW=$(post "/api/emails/$EMAIL_ID/action" '{"action":"save"}')
  S=$(status "$RAW")
  [ "$S" = "200" ] && ok "POST /api/emails/$EMAIL_ID/action save → 200" || bad "email action → $S"
fi

step "15. Logout / signout invalidates session"
SOCSRF=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE/api/auth/csrf" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE/api/auth/signout" -H "Content-Type: application/x-www-form-urlencoded" -d "csrfToken=$SOCSRF&callbackUrl=/&json=true" -w "\n__STATUS__%{http_code}")
S=$(status "$RAW")
[ "$S" = "200" ] && ok "POST /api/auth/signout → 200" || bad "signout → $S"
SESS=$(curl -s -b "$COOKIE_JAR" "$BASE/api/auth/session")
[ "$SESS" = "{}" ] && ok "session cleared after signout" || bad "session lingering: $SESS"
R=$(curl -s -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$BASE/api/profile")
[ "$R" = "401" ] && ok "API back to 401 after signout" || bad "API still authed after signout: $R"

echo
echo "===================="
echo "RESULTS: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  echo "FAILURES:"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
echo "All checks passed."
