"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Bookmark, Loader2 } from "lucide-react";

interface Props {
  opportunityId: string;
  kind: "job" | "event" | "course";
  status: string;
  onFollowed?: (info: { tasksAdded: number; weeklyFocus: string }) => void;
}

const FOLLOW_LABEL = {
  job: "Apply this week",
  event: "Follow event",
  course: "Start this week",
};

export function ActionButtons({ opportunityId, kind, status, onFollowed }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [local, setLocal] = useState(status);
  const [flash, setFlash] = useState<string | null>(null);

  async function call(action: "follow" | "ignore" | "save") {
    setBusy(action);
    try {
      const r = await fetch(`/api/opportunities/${opportunityId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Action failed");
      setLocal(data.status);
      if (action === "follow") {
        setFlash(`Added ${data.tasksAdded} tasks to this week.`);
        onFollowed?.(data);
      } else if (action === "save") {
        setFlash("Saved.");
      } else {
        setFlash("Ignored.");
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setFlash((e as Error).message);
    } finally {
      setBusy(null);
      setTimeout(() => setFlash(null), 3500);
    }
  }

  if (local === "approved") {
    return (
      <div className="flex items-center gap-2 text-success text-xs">
        <Check className="w-4 h-4" /> Approved
        {flash && <span className="text-muted">· {flash}</span>}
      </div>
    );
  }
  if (local === "ignored") {
    return <span className="text-xs text-muted">Ignored</span>;
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button onClick={() => call("follow")} disabled={!!busy || pending} className="btn-primary text-xs px-3 py-1.5">
        {busy === "follow" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        {FOLLOW_LABEL[kind]}
      </button>
      <button onClick={() => call("save")} disabled={!!busy} className="btn-ghost text-xs px-3 py-1.5">
        {busy === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
        {local === "saved" ? "Saved" : "Save"}
      </button>
      <button onClick={() => call("ignore")} disabled={!!busy} className="btn-danger text-xs px-3 py-1.5">
        {busy === "ignore" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
        Ignore
      </button>
      {flash && <span className="text-xs text-muted">{flash}</span>}
    </div>
  );
}
