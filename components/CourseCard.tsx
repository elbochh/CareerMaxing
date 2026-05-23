import { ExternalLink, GraduationCap, Clock, DollarSign } from "lucide-react";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ActionButtons } from "@/components/ActionButtons";
import type { CoursePayload, OpportunityDoc } from "@/types";

export function CourseCard({ opp }: { opp: OpportunityDoc<CoursePayload> }) {
  const p = opp.payload;
  return (
    <article className="card card-hover p-5 space-y-3 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-white font-semibold leading-tight flex items-center gap-2">
            {p.pathWeek && <span className="badge-accent">Week {p.pathWeek}</span>}
            {p.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1">
            <span className="inline-flex items-center gap-1"><GraduationCap className="w-3 h-3" />{p.provider}</span>
            <span className="badge">{p.level}</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{p.estimatedHours}h</span>
            <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />{p.cost}</span>
          </div>
        </div>
        <ScoreBadge score={opp.score} band={opp.scoreBand} kindLabel="Learning Value" />
      </div>

      <p className="text-xs text-muted-strong">{p.whyUseful}</p>

      <div>
        <div className="label mb-1">Best for</div>
        <div className="flex flex-wrap gap-1.5">
          {p.bestFor.map((s) => <span key={s} className="badge">{s}</span>)}
        </div>
      </div>

      <div>
        <div className="label mb-1">Suggested learning tasks</div>
        <ul className="text-xs text-muted-strong list-disc list-inside space-y-0.5">
          {p.suggestedLearningTasks.slice(0, 4).map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-accent-glow inline-flex items-center gap-1 hover:underline">
          View source <ExternalLink className="w-3 h-3" />
        </a>
        <ActionButtons opportunityId={opp._id!} kind="course" status={opp.status} />
      </div>
    </article>
  );
}
