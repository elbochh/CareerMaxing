# Resource Data Pipeline

CareerMaxing now treats every displayed job, event, and learning resource as untrusted until it passes source validation.

## Resource Sources

- Jobs come from the public Remotive remote jobs API in `lib/services/remotive.ts`, then flow through `lib/agents/jobs.ts`.
- Events come from the public Devpost hackathons API in `lib/services/devpost.ts`, then flow through `lib/agents/events.ts`.
- Learning resources come from the curated, source-backed list in `seed/courses.json`. If `LLM_ENABLED=true`, `lib/agents/learning.ts` may ask the LLM for extra course recommendations, but those AI suggestions are treated as untrusted until validation passes.
- The Domain Agent in `lib/agents/domain.ts` only creates search queries and related domain terms. It does not create visible opportunities.
- `seed/jobs.json` and `seed/events.json` are intentionally empty. The old entries pointed to generic career pages or broad event calendars, so they are not used for display.

## Validation Rules

`lib/source-validation.ts` validates every candidate before it is inserted into `opportunities`.

Required fields:

- real title
- real organization/company/provider
- real `sourceUrl`
- reachable HTTP or HTTPS source URL
- real location or online status for jobs/events
- valid, non-expired event date for events

Stored validation metadata:

- `isVerified`
- `verifiedAt`
- `sourceName`
- `sourceUrl`
- `confidenceScore`
- `rejectionReason`
- `verificationNotes`

Trusted API resources receive high confidence after URL reachability passes. Curated learning resources receive high confidence after URL reachability passes. AI learning recommendations must use a trusted learning provider host and pass URL reachability; otherwise they are rejected.

## Display And Checklist Rules

- `lib/db/repos.ts` filters opportunity list and dashboard counts to `isVerified: true`.
- Job, event, and course cards show a "Verified source" badge and link to the validated `sourceUrl`.
- `app/api/opportunities/[id]/action/route.ts` blocks checklist generation for unverified opportunities.
- Checklist tasks keep `sourceOpportunityId`, and `lib/verified-tasks.ts` hides old tasks whose source opportunity is missing or unverified.

## Debug Logging

Each scan logs source accuracy counts:

```text
[resources:jobs] found=24 verified=22 rejected=2
[resources:events] found=10 verified=8 rejected=2
[resources:learning] found=10 verified=10 rejected=0
```

Rejected resources include a reason such as `missing_url`, `broken_url`, `expired_event`, `source_mismatch`, or `ai_generated_without_evidence`.
