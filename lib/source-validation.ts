import type {
  OpportunityKind,
  RejectionReason,
  SourceEvidenceType,
} from "@/types";

export interface SourceCandidate {
  kind: OpportunityKind;
  title?: string;
  organization?: string;
  location?: string;
  isOnline?: boolean;
  eventDate?: string;
  sourceName?: string;
  sourceUrl?: string;
  evidenceType: SourceEvidenceType;
}

export interface SourceValidationResult {
  isVerified: boolean;
  verifiedAt?: string;
  sourceName: string;
  sourceUrl: string;
  confidenceScore: number;
  rejectionReason?: RejectionReason;
  verificationNotes?: string;
}

export interface ValidationAudit<T> {
  accepted: Array<{ item: T; validation: SourceValidationResult }>;
  rejected: Array<{ item: T; validation: SourceValidationResult }>;
}

const REQUEST_TIMEOUT_MS = Number(process.env.SOURCE_VALIDATION_TIMEOUT_MS || 7000);

const TRUSTED_LEARNING_HOSTS = [
  "deeplearning.ai",
  "coursera.org",
  "edx.org",
  "cloudskillsboost.google",
  "learn.microsoft.com",
  "skillbuilder.aws",
  "freecodecamp.org",
  "fast.ai",
  "kaggle.com",
  "huggingface.co",
  "openai.com",
  "github.com",
  "developers.google.com",
  "ai.google.dev",
  "docs.aws.amazon.com",
  "anthropic.com",
  "stanford.edu",
  "mit.edu",
  "ocw.mit.edu",
];

function clean(s?: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function normalizeUrl(input?: string): string | null {
  const raw = clean(input);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function hostMatches(host: string, allowList: string[]): boolean {
  return allowList.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function inferSourceName(url?: string, fallback?: string): string {
  const fromFallback = clean(fallback);
  if (fromFallback) return fromFallback;
  if (!url) return "Unknown source";
  const host = hostname(url);
  return host || "Unknown source";
}

function reject(
  candidate: SourceCandidate,
  reason: RejectionReason,
  sourceUrl?: string,
  notes?: string,
): SourceValidationResult {
  return {
    isVerified: false,
    sourceName: inferSourceName(sourceUrl, candidate.sourceName),
    sourceUrl: sourceUrl || clean(candidate.sourceUrl),
    confidenceScore: 0,
    rejectionReason: reason,
    verificationNotes: notes,
  };
}

async function requestUrl(url: string, method: "HEAD" | "GET") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "User-Agent": "CareerMaxingSourceValidator/1.0",
      },
      cache: "no-store",
    });
    return { ok: res.status >= 200 && res.status < 400, status: res.status };
  } finally {
    clearTimeout(timeout);
  }
}

async function reachable(url: string): Promise<{ ok: boolean; notes: string }> {
  let lastStatus = "not-requested";
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await requestUrl(url, method);
      lastStatus = `${method} ${res.status}`;
      if (res.ok) return { ok: true, notes: lastStatus };
    } catch (err) {
      lastStatus = `${method} ${(err as Error).message}`;
    }
  }
  return { ok: false, notes: lastStatus };
}

function eventDateIsValid(date?: string): { ok: true } | { ok: false; reason: RejectionReason } {
  const raw = clean(date);
  if (!raw) return { ok: false, reason: "invalid_event_date" };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { ok: false, reason: "invalid_event_date" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventEnd = new Date(parsed);
  eventEnd.setHours(23, 59, 59, 999);
  if (eventEnd < today) return { ok: false, reason: "expired_event" };
  return { ok: true };
}

function confidenceFor(evidenceType: SourceEvidenceType): number {
  if (evidenceType === "trusted_api") return 0.95;
  if (evidenceType === "curated") return 0.9;
  return 0.78;
}

export async function validateSourceCandidate(
  candidate: SourceCandidate,
): Promise<SourceValidationResult> {
  const title = clean(candidate.title);
  const organization = clean(candidate.organization);
  const location = clean(candidate.location);
  const sourceUrl = normalizeUrl(candidate.sourceUrl);

  if (!title) return reject(candidate, "missing_title");
  if (!organization) return reject(candidate, "missing_organization");
  if (!sourceUrl) return reject(candidate, "missing_url");
  if (candidate.kind !== "course" && !candidate.isOnline && !location) {
    return reject(candidate, "missing_location", sourceUrl);
  }
  if (candidate.kind === "event") {
    const dateCheck = eventDateIsValid(candidate.eventDate);
    if (!dateCheck.ok) return reject(candidate, dateCheck.reason, sourceUrl);
  }
  if (candidate.evidenceType === "ai" && candidate.kind === "course") {
    const host = hostname(sourceUrl);
    if (!hostMatches(host, TRUSTED_LEARNING_HOSTS)) {
      return reject(
        candidate,
        "ai_generated_without_evidence",
        sourceUrl,
        `AI learning URL host "${host}" is not on the trusted-source allowlist.`,
      );
    }
  }

  const reachability = await reachable(sourceUrl);
  if (!reachability.ok) {
    return reject(candidate, "broken_url", sourceUrl, reachability.notes);
  }

  return {
    isVerified: true,
    verifiedAt: new Date().toISOString(),
    sourceName: inferSourceName(sourceUrl, candidate.sourceName),
    sourceUrl,
    confidenceScore: confidenceFor(candidate.evidenceType),
    verificationNotes: reachability.notes,
  };
}

export async function validateResourceBatch<T>(
  label: string,
  items: T[],
  toCandidate: (item: T) => SourceCandidate,
): Promise<ValidationAudit<T>> {
  const checked = await Promise.all(
    items.map(async (item) => ({ item, validation: await validateSourceCandidate(toCandidate(item)) })),
  );
  const accepted = checked.filter((r) => r.validation.isVerified);
  const rejected = checked.filter((r) => !r.validation.isVerified);

  console.info(
    `[resources:${label}] found=${items.length} verified=${accepted.length} rejected=${rejected.length}`,
  );
  for (const r of rejected) {
    console.warn(
      `[resources:${label}] rejected reason=${r.validation.rejectionReason} url=${r.validation.sourceUrl || "missing"} notes=${r.validation.verificationNotes || ""}`,
    );
  }

  return { accepted, rejected };
}
