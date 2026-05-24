"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Filter, Layers } from "lucide-react";
import { ScanButton } from "@/components/ScanButton";
import { JobCard } from "@/components/JobCard";
import { EventCard } from "@/components/EventCard";
import { CourseCard } from "@/components/CourseCard";
import type { CoursePayload, EventPayload, JobPayload, OpportunityDoc, OpportunityKind, OpportunityStatus } from "@/types";

const FILTERS: { label: string; value: OpportunityStatus | "all" }[] = [
  { label: "All Items", value: "all" },
  { label: "New", value: "new" },
  { label: "Approved", value: "approved" },
  { label: "Saved", value: "saved" },
  { label: "Ignored", value: "ignored" },
];

export function OpportunityList({ kind, title, subtitle }: { kind: OpportunityKind; title: string; subtitle: string }) {
  const [items, setItems] = useState<OpportunityDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OpportunityStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/opportunities?kind=${kind}`);
      const data = await r.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Failed to load pipeline opportunities:", error);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* 1. Header Canvas Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#C1C8E4]/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5680E9] tracking-wider uppercase">
            <Layers className="w-3.5 h-3.5" />
            <span>AI Control Center</span>
          </div>
          <h1 className="text-3xl font-black text-[#5680E9] tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            {subtitle}
          </p>
        </div>
        <div className="shrink-0 group">
          <ScanButton onComplete={load} />
        </div>
      </div>

      {/* 2. Control & Filtering Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between bg-white p-3 rounded-2xl border border-[#C1C8E4]/30 shadow-sm shadow-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 px-2 uppercase tracking-widest">
          <Filter className="w-3.5 h-3.5 text-[#5AB9EA]" />
          <span>Filter Pipeline:</span>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const count = f.value === "all" ? items.length : items.filter((i) => i.status === f.value).length;
            const isSelected = filter === f.value;
            
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`${
                  isSelected ? "chip-on" : "chip"
                } relative flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-[0.97]`}
              >
                {f.label}
                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-black tracking-normal transition-colors ${
                  isSelected 
                    ? "bg-[#5680E9] text-white" 
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Conditional Content Renderer Feed */}
      {loading ? (
        <div className="card p-16 text-center flex flex-col items-center justify-center gap-3 border-dashed border-2">
          <div className="p-4 bg-[#5AB9EA]/10 rounded-full text-[#5680E9]">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-sm font-bold text-slate-500 tracking-wide">
            Analyzing architecture nodes and updating entries...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center max-w-xl mx-auto border-2 border-dashed border-[#C1C8E4]/60 bg-white/50 backdrop-blur-sm shadow-lg flex flex-col items-center justify-center">
          <div className="p-4 bg-[#5AB9EA]/10 text-[#8860D0] rounded-2xl mb-4 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-base font-extrabold text-[#5680E9] tracking-tight">
            {items.length === 0 ? "No verified opportunities found yet" : "No exact status match found"}
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xs font-medium leading-relaxed">
            {items.length === 0
              ? "Run scan again or broaden filters. Unverified or broken-source items are hidden from this list."
              : "No current nodes correspond to this specific classification state criteria filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 group/feed">
          {filtered.map((opp) => {
            return (
              <div 
                key={opp._id} 
                className="transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5"
              >
                {kind === "job" && <JobCard opp={opp as OpportunityDoc<JobPayload>} />}
                {kind === "event" && <EventCard opp={opp as OpportunityDoc<EventPayload>} />}
                {kind === "course" && <CourseCard opp={opp as OpportunityDoc<CoursePayload>} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
