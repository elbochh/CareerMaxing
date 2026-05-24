# CareerMaxing

**Your daily AI career agent for AI students.** A multi-agent web app that discovers AI jobs, events, hackathons, and learning paths tailored to your goals, school schedule, and weekly hours — then turns approved opportunities into a realistic Monday-to-Sunday checklist.

Built in 48 hours for a hackathon. Source-verified so screenshots stay credible. Cost-aware: defaults to **zero LLM calls** and uses `gpt-4o-mini` with batched, schema-validated calls when enabled.

---

## Problem

AI students drown in three separate firehoses — job boards, event calendars, and course catalogs — and none of them understand their school schedule, AI focus, or skill level. They lose hours every week triaging noise. Interview emails get buried. Hackathon deadlines slip. Beginners pick the wrong course order.

## Solution

CareerMaxing is an AI career operating system, not a job board. A pipeline of agents:

1. **Domain Agent** expands the user's chosen AI focus into 15+ subfields and search queries (e.g. *Agentic AI → LangChain, LangGraph, RAG, tool calling, multi-agent…*).
2. **Job / Event / Learning Agents** find, deduplicate, score (0–100), and explain each opportunity.
3. **Email Agent** detects career-related emails and extracts interview details (company, role, date, time, link, prep).
4. **Checklist Agent** converts *approved* opportunities into Mon–Sun tasks that respect the student's school schedule and weekly hour budget.

User stays in the loop: nothing is added to the checklist unless the user clicks **Follow / Apply / Start**.

---

## Architecture

```
User → /onboarding → profiles
     → "Run Today's Scan" → Domain Agent (cached per profile)
                          → Job Agent + Event Agent + Learning Agent
                          → Dedupe + Score → opportunities (Mongo)
                          → Jobs / Events / Learning pages
                          → Approve → Checklist Agent → tasks (Mongo)
```

All visible jobs, events, and learning resources are validated before display. See `docs/data-pipeline.md` for source rules, rejection logging, and checklist safeguards.

### File map

```
app/                        Next.js App Router pages + API routes
  page.tsx                  Landing
  onboarding/page.tsx       Multi-step profile form
  dashboard/page.tsx        Score, top recs, weekly progress, domain expansion
  jobs/ events/ learning/   Opportunity lists
  checklist/page.tsx        Mon–Sun grid with XP + time totals
  api/
    profile, scan, opportunities, opportunities/[id]/action,
    email/scan, emails, emails/[id]/action,
    gmail/opportunities, dashboard, checklist, tasks/[id],
    integrations, auth/[...nextauth]
components/                 Cards, badges, scan button, XP bar, navbar, etc.
lib/
  agents/                   domain, jobs, events, learning, email, checklist
  db/                       mongo client + typed repos
  llm/                      OpenAI + mock + zod-validated JSON mode
  services/remotive.ts      Live job source
  services/devpost.ts       Live hackathon/event source
  services/gmail.ts         Gmail REST (read-only)
  source-validation.ts      Reachability + metadata validation for resources
  domains.ts                Static domain expansion (matches the spec)
  dedupe.ts, scoring.ts     Normalized keys + score bands
seed/                       Curated courses; job/event seeds are intentionally empty
types/index.ts              Shared types
```

### Data model (MongoDB Atlas)

| Collection         | Purpose                                                            | Unique index               |
|--------------------|--------------------------------------------------------------------|----------------------------|
| `profiles`         | Single user profile (`userId: "local-user"`).                      | `{ userId }`               |
| `domainExpansions` | Per-profile cached Domain Agent output.                            | `{ userId }`               |
| `opportunities`    | Verified jobs/events/courses with score band, status, source URL, verification metadata. | `{ userId, kind, dedupeKey }` |
| `emails`           | Pasted or Gmail emails + Email Agent analysis.                     | `{ userId, dedupeKey }`    |
| `tasks`            | Weekly tasks bound to a `weekStart` + day.                         | `{ userId, weekStart }`    |

Dedupe keys:
- Jobs: `lowercase(title + company + location)`
- Events: `lowercase(title + organizer + date)` (day precision)
- Courses: `lowercase(title + provider)`
- Emails: `lowercase(subject + sender + date)` (day precision) or Gmail message id

---

## Setup

### Requirements
- Node 18.18+ (Node 20 recommended)
- A MongoDB Atlas cluster (free tier works) — connection string in `MONGODB_URI`

### Install
```bash
npm install
cp .env.example .env.local        # fill in MONGODB_URI (others optional)
npm run dev
```

Open http://localhost:3000.

### Build
```bash
npm run build && npm start
```

### Env variables

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string. Include `/careermaxing` before `?`. |
| `MONGODB_DB` | no | Defaults to `careermaxing`. |
| `NEXTAUTH_URL` | only for Gmail | `http://localhost:3000` in dev. |
| `NEXTAUTH_SECRET` | only for Gmail | `openssl rand -base64 32`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | only for Gmail | OAuth client with Gmail API + `gmail.readonly` scope. |
| `OPENAI_API_KEY` | no | If absent, agents stay in mock mode (free). |
| `LLM_MODEL` | no | Defaults to `gpt-4o-mini`. |
| `LLM_ENABLED` | no | `false` (default) keeps cost at $0. Set to `true` to use OpenAI. |
| `USE_MOCK_DATA` | no | Legacy LLM mock switch. Resource cards still require verified URLs. |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `THEMUSE_API_KEY`, `REMOTIVE_API_BASE` | no | Reserved for future API wrappers. Remotive is used for jobs today. |

The repo ships with `.env.local` ignored by git and a sanitized `.env.example`.

---

## Demo flow

1. **`/onboarding`** — fill: Alex, U of Calgary, beginner, **Agentic AI**, locations Calgary + Remote, interested in jobs / internships / hackathons / courses, 10 h/week, Mon + Wed busy 9–15, skills Python + SQL, goals "get internship" + "build portfolio".
2. **`/dashboard`** — click **Run Today's Career Scan**. Counts populate: jobs / events / courses found, all new.
3. **`/jobs`** — cards come from verified Remotive postings. Click **Apply this week** → toast "Added N tasks to this week".
4. **`/events`** — cards come from verified Devpost hackathons/events. Click **Follow event** on one. Hackathon prep tasks appear in checklist.
5. **`/learning`** — beginner Agentic AI path: LLM fundamentals → Prompt engineering → Tool calling → RAG → LangChain → LangGraph → Multi-agent → Deploy. Click **Start this week** on Week 1.
6. **`/checklist`** — Mon–Sun grid with totals, XP bar, click checkboxes to toggle done. Dashboard XP bar updates.
7. Run another scan — counts show existing verified matches refreshed (dedupe works).

### Optional: Gmail scan
The backend Gmail routes remain available for future use, but the inbox page is removed from the current hackathon screenshot flow.

---

## Agent details

### Domain Agent (`lib/agents/domain.ts`)
- Input: user profile.
- Output: `expandedSubfields`, `jobSearchQueries`, `eventSearchQueries`, `learningSearchQueries`, `jobTitles`.
- Cached per `userId` in `domainExpansions` — re-runs only when the primary domain changes.
- Mock branch reads from `lib/domains.ts`, which mirrors the spec verbatim for Agentic AI / AI general / Machine Learning / Data Science / Generative AI / NLP / Computer Vision / AI Automation / MLOps / AI Product.

### Job / Event / Learning Agents
- Fetch live jobs/events or curated learning resources, then validate every source before display.
- Score 0–100 using weighted blends:
  - **Jobs**: 35% domain × 25% skill overlap × 20% location × 20% level match.
  - **Events**: 40% domain × 30% location × 30% opportunity-type bonus.
  - **Learning**: 60% domain × 40% level.
- Bands: 90+ strong / 70+ good / 50+ maybe / <50 ignore.
- Dedup by normalized key **and** source URL.
- Recommended action follows the band (e.g. `Apply this week` only for strong fits).

### Email Agent (`lib/agents/email.ts`)
- Single batched call; deterministic mock uses keyword classification + regex date/time/link extraction.
- Detects interviews and extracts company, role, date (`YYYY-MM-DD`), time, location/meeting link, and prep list.
- **Never** auto-creates tasks — only on **Follow this**.

### Checklist Agent (`lib/agents/checklist.ts`)
- Deterministic scheduler (no LLM needed). Spreads candidate tasks across Mon–Sun.
- Respects school schedule (busy slots pre-consume per-day minutes).
- Caps weekly minutes to `weeklyHours × 60`; intensity = `light | standard | full`.
- For interviews: prep tasks earlier in week, interview itself pinned to its weekday.
- For events with a known date: registration first, then prep, then attendance pinned to event day.
- For jobs: tailor resume → cover note → submit (Wed) → follow-up (Fri).

---

## Cost strategy

Default install costs **$0** for LLM usage:
- `LLM_ENABLED=false` and `USE_MOCK_DATA=true` skip LLM calls.
- Resource scans still call free public/curated sources and hide anything that is not verified.

When `LLM_ENABLED=true` and a key is set:
- Model: `gpt-4o-mini` (~$0.15/1M input, ~$0.60/1M output).
- JSON mode + zod validation + ~600 max output tokens per agent call.
- Domain Agent is cached per profile (one call per profile change).
- Gmail uses snippets only (not full bodies) and caps at 10 messages.

A single full demo (profile + scan + 1 email follow) at `LLM_ENABLED=true` is well under a cent of OpenAI usage.

---

## Security

- `.env*.local` is gitignored. Only sanitized `.env.example` is in the repo.
- Gmail uses `gmail.readonly` only — we never send mail.
- Bodies from Gmail are stored as snippets only.
- No tasks are ever created without explicit user approval.
- No tokens are sent to the browser.

---

## Hackathon judging map

- **Innovation** — multi-agent pipeline turning AI career chaos into a personalized daily plan.
- **Technical execution** — Next.js 14 App Router, MongoDB Atlas with indexes, zod-validated LLM I/O, deterministic mock-mode, dedup across daily scans, schedule-aware planner.
- **Functional completeness** — every page, every API, every agent, plus end-to-end demo (scan → approve → checklist; paste interview → prep tasks).
- **Problem-solution fit** — built for AI students in Calgary/Alberta/online specifically, with the exact opportunity types they care about.
- **UX / design** — dark, premium, badge-rich UI; weekly grid; XP progression.
- **Demo communication** — single big **Run Today's Career Scan** button; visible Domain Agent output; explainable scores ("why useful").
- **Ambition** — five-agent system + Gmail integration + offline-capable demo in 48 hours.

---

## Scripts

```bash
npm run dev          # next dev
npm run build        # next build
npm start            # next start
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
```
