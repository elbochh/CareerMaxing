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

type EventWindowFilter = "all" | "thisWeek" | "thisMonth";

function parseTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function startOfWeek(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfWeek(now: Date): Date {
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function OpportunityList({ kind, title, subtitle }: { kind: OpportunityKind; title: string; subtitle: string }) {
  const [items, setItems] = useState<OpportunityDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OpportunityStatus | "all">("all");
  const [hidePastEvents, setHidePastEvents] = useState(true);
  const [eventWindow, setEventWindow] = useState<EventWindowFilter>("all");
  const [onlineOnly, setOnlineOnly] = useState(false);

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

  const eventFiltered = useMemo(() => {
    if (kind !== "event") return filtered;

    const now = new Date();
    const nowTs = now.getTime();
    const weekStartTs = startOfWeek(now).getTime();
    const weekEndTs = endOfWeek(now).getTime();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const scoped = (filtered as OpportunityDoc<EventPayload>[]).filter((opp) => {
      const eventDate = parseTimestamp(opp.payload.date);
      if (onlineOnly && !opp.payload.isOnline) return false;
      if (!eventDate) return eventWindow === "all" && !hidePastEvents;
      if (hidePastEvents && eventDate < nowTs) return false;
      if (eventWindow === "thisWeek") return eventDate >= weekStartTs && eventDate <= weekEndTs;
      if (eventWindow === "thisMonth") {
        const d = new Date(eventDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      return true;
    });

    return scoped.sort((a, b) => {
      const aTs = parseTimestamp(a.payload.date);
      const bTs = parseTimestamp(b.payload.date);
      if (!aTs && !bTs) return b.score - a.score;
      if (!aTs) return 1;
      if (!bTs) return -1;

      const aUpcoming = aTs >= nowTs;
      const bUpcoming = bTs >= nowTs;
      if (aUpcoming && !bUpcoming) return -1;
      if (!aUpcoming && bUpcoming) return 1;

      if (aUpcoming && bUpcoming) return aTs - bTs;
      return bTs - aTs;
    });
  }, [filtered, hidePastEvents, onlineOnly, eventWindow, kind]);

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

      {kind === "event" && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setHidePastEvents((v) => !v)} className={hidePastEvents ? "chip-on" : "chip"}>
            Upcoming only
          </button>
          <button onClick={() => setEventWindow("all")} className={eventWindow === "all" ? "chip-on" : "chip"}>
            Any date
          </button>
          <button onClick={() => setEventWindow("thisWeek")} className={eventWindow === "thisWeek" ? "chip-on" : "chip"}>
            This week
          </button>
          <button onClick={() => setEventWindow("thisMonth")} className={eventWindow === "thisMonth" ? "chip-on" : "chip"}>
            This month
          </button>
          <button onClick={() => setOnlineOnly((v) => !v)} className={onlineOnly ? "chip-on" : "chip"}>
            Online
          </button>
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-muted">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
        </div>
      ) : eventFiltered.length === 0 ? (
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
          {eventFiltered.map((opp) => {
            if (kind === "job") return <JobCard key={opp._id} opp={opp as OpportunityDoc<JobPayload>} />;
            if (kind === "event") return <EventCard key={opp._id} opp={opp as OpportunityDoc<EventPayload>} />;
            return <CourseCard key={opp._id} opp={opp as OpportunityDoc<CoursePayload>} />;
          })}
        </div>
      )}
    </div>
  );
}
