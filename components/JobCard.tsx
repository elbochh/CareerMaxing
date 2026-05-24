import { Briefcase, ExternalLink, MapPin } from "lucide-react";
import { ActionButtons } from "@/components/ActionButtons";
import { ScoreBadge } from "@/components/ScoreBadge";
import type { JobPayload, OpportunityDoc } from "@/types";

export function JobCard({ opp }: { opp: OpportunityDoc<JobPayload> }) {
  const p = opp.payload;
  const title = p.title?.trim() || "Untitled job opportunity";
  const company = p.company?.trim() || "Unknown company";
  const location = p.location?.trim() || "Location not listed";
  return (
    <article className="card card-hover p-5 space-y-3 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-slate-800 font-semibold leading-tight">{title}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1">
            <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" />{company}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{location}</span>
            {p.isRemote && <span className="badge-accent">Remote</span>}
            <span className="badge">{p.source}</span>
            <span className="badge">{p.difficulty}</span>
          </div>
        </div>
        <ScoreBadge score={opp.score} band={opp.scoreBand} kindLabel="Career Fit" />
      </div>

      {p.description && <p className="text-sm text-muted-strong line-clamp-3">{p.description}</p>}

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div>
          <div className="label mb-1">Matched skills</div>
          <div className="flex flex-wrap gap-1.5">
            {p.matchedSkills.length === 0 ? <span className="text-muted">—</span> : p.matchedSkills.map((s) => <span key={s} className="badge-success">{s}</span>)}
          </div>
        </div>
        <div>
          <div className="label mb-1">Missing skills</div>
          <div className="flex flex-wrap gap-1.5">
            {p.missingSkills.length === 0 ? <span className="text-muted">None</span> : p.missingSkills.slice(0, 5).map((s) => <span key={s} className="badge-warn">{s}</span>)}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-strong italic">{p.whyUseful}</p>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-accent-glow inline-flex items-center gap-1 hover:underline">
          View source <ExternalLink className="w-3 h-3" />
        </a>
        <ActionButtons opportunityId={opp._id!} kind="job" status={opp.status} />
      </div>
    </article>
  );
}
