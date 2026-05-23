"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { ScanButton } from "@/components/ScanButton";
import { JobCard } from "@/components/JobCard";
import { EventCard } from "@/components/EventCard";
import { CourseCard } from "@/components/CourseCard";
import type { CoursePayload, EventPayload, JobPayload, OpportunityDoc, OpportunityKind, OpportunityStatus } from "@/types";

const FILTERS: { label: string; value: OpportunityStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Approved", value: "approved" },
  { label: "Saved", value: "saved" },
  { label: "Ignored", value: "ignored" },
];

export function OpportunityList({ kind, title, subtitle }: { kind: OpportunityKind; title: string; subtitle: string }) {
  const [items, setItems] = useState<OpportunityDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OpportunityStatus | "all">("all");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/opportunities?kind=${kind}`);
      const data = await r.json();
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [kind]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
          <p className="text-muted mt-1">{subtitle}</p>
        </div>
        <ScanButton />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={filter === f.value ? "chip-on" : "chip"}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-2 text-muted">{items.filter((i) => i.status === f.value).length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-muted">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <Sparkles className="w-5 h-5 text-accent mx-auto mb-2" />
          <p className="text-muted-strong">
            {items.length === 0
              ? "Nothing here yet. Run a Career Scan to populate this list."
              : "No items match this filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((opp) => {
            if (kind === "job") return <JobCard key={opp._id} opp={opp as OpportunityDoc<JobPayload>} />;
            if (kind === "event") return <EventCard key={opp._id} opp={opp as OpportunityDoc<EventPayload>} />;
            return <CourseCard key={opp._id} opp={opp as OpportunityDoc<CoursePayload>} />;
          })}
        </div>
      )}
    </div>
  );
}
