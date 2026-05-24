"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Bookmark, Loader2, AlertTriangle, MailQuestion, Calendar, Link2, User } from "lucide-react";
import type { EmailDoc } from "@/types";
import { cn } from "@/lib/utils";

const URGENCY_BADGE = {
  high: "badge-danger",
  medium: "badge-warn",
  low: "badge",
} as const;

export function EmailCard({ email }: { email: EmailDoc }) {
  const router = useRouter();
  const a = email.analysis;
  const subject = email.subject?.trim() || "Untitled email";
  const sender = email.sender?.trim() || "Unknown sender";
  const [local, setLocal] = useState(email.status);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function call(action: "follow" | "ignore" | "save") {
    setBusy(action);
    try {
      const r = await fetch(`/api/emails/${email._id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setLocal(data.status);
      if (action === "follow") setFlash(`Added ${data.tasksAdded} tasks. Focus: ${data.weeklyFocus}`);
      startTransition(() => router.refresh());
    } catch (e) {
      setFlash((e as Error).message);
    } finally {
      setBusy(null);
      setTimeout(() => setFlash(null), 4000);
    }
  }

  return (
    <article className="card card-hover p-5 space-y-3 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-slate-800 font-semibold leading-tight">{subject}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1">
            <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{sender}</span>
            <span className="badge">{a.category}</span>
            <span className={URGENCY_BADGE[a.urgency]}>{a.urgency}</span>
            {a.isCareerRelated ? (
              <span className="badge-success">Career-related</span>
            ) : (
              <span className="badge-danger">Not career</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted">Value</div>
          <div className="text-2xl font-bold text-slate-800">{a.careerValueScore}</div>
        </div>
      </div>

      <p className="text-sm text-muted-strong">{a.whyItMatters}</p>

      {a.extractedInterview.hasInterview && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 space-y-2">
          <div className="text-xs font-semibold text-accent-glow flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Interview detected
          </div>
          <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {a.extractedInterview.company && <Kv k="Company" v={a.extractedInterview.company} />}
            {a.extractedInterview.role && <Kv k="Role" v={a.extractedInterview.role} />}
            {a.extractedInterview.date && <Kv k="Date" v={a.extractedInterview.date} />}
            {a.extractedInterview.time && <Kv k="Time" v={a.extractedInterview.time} />}
            {a.extractedInterview.locationOrMeetingLink && (
              <div className="sm:col-span-2 text-xs text-muted-strong inline-flex items-center gap-1 break-all">
                <Link2 className="w-3 h-3" /> {a.extractedInterview.locationOrMeetingLink}
              </div>
            )}
          </div>
          {a.extractedInterview.prepRequirements && a.extractedInterview.prepRequirements.length > 0 && (
            <div>
              <div className="label mb-1">Prep requirements</div>
              <ul className="text-xs text-muted-strong list-disc list-inside">
                {a.extractedInterview.prepRequirements.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="label mb-1">Suggested actions</div>
        <ul className="text-xs text-muted-strong list-disc list-inside">
          {a.suggestedActions.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>

      <details className="text-xs text-muted">
        <summary className="cursor-pointer text-muted-strong">Show original email</summary>
        <pre className="mt-2 whitespace-pre-wrap p-3 bg-bg-subtle rounded-lg border border-border max-h-48 overflow-auto">{email.body}</pre>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <span className="text-[10px] text-muted">Effort: {a.estimatedEffort}</span>
        {local === "approved" ? (
          <span className="text-xs text-success inline-flex items-center gap-1"><Check className="w-3 h-3" /> Approved</span>
        ) : local === "ignored" ? (
          <span className="text-xs text-muted">Ignored</span>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => call("follow")} disabled={!!busy} className="btn-primary text-xs px-3 py-1.5">
              {busy === "follow" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Follow this
            </button>
            <button onClick={() => call("save")} disabled={!!busy} className="btn-ghost text-xs px-3 py-1.5">
              {busy === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
              Maybe later
            </button>
            <button onClick={() => call("ignore")} disabled={!!busy} className="btn-danger text-xs px-3 py-1.5">
              {busy === "ignore" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              Ignore
            </button>
          </div>
        )}
      </div>
      {flash && <p className="text-xs text-muted">{flash}</p>}
    </article>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="label">{k}</span>
      <span className="text-muted-strong">{v}</span>
    </div>
  );
}
