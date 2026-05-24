import { format } from "date-fns";
import { CalendarRange, ExternalLink, MapPin, Globe, Award, Users, Lightbulb, Wand2 } from "lucide-react";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ActionButtons } from "@/components/ActionButtons";
import { VerifiedSource } from "@/components/VerifiedSource";
import type { EventPayload, OpportunityDoc } from "@/types";

const URGENCY_BADGE: Record<EventPayload["urgency"], string> = {
  high: "badge-danger",
  medium: "badge-warn",
  low: "badge",
};

export function EventCard({ opp }: { opp: OpportunityDoc<EventPayload> }) {
  const p = opp.payload;
  const title = p.title?.trim() || "Untitled event";
  const location = p.location?.trim() || "Location not listed";
  const sourceUrl = opp.sourceUrl || p.url;
  const date = (() => {
    try {
      return format(new Date(p.date), "EEE MMM d · h:mm a");
    } catch {
      return p.date;
    }
  })();

  return (
    <article className="card card-hover p-5 space-y-3 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-slate-800 font-semibold leading-tight">{title}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1">
            <span className="badge">{p.eventType}</span>
            <span className="inline-flex items-center gap-1"><CalendarRange className="w-3 h-3" />{date}</span>
            <span className="inline-flex items-center gap-1">
              {p.isOnline ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
              {p.isOnline ? "Online" : location}
            </span>
            <span className="badge">{opp.sourceName || p.source}</span>
            <span className={URGENCY_BADGE[p.urgency]}>{p.urgency} urgency</span>
            <VerifiedSource opp={opp} />
          </div>
        </div>
        <ScoreBadge score={opp.score} band={opp.scoreBand} kindLabel="Career Value" />
      </div>

      <p className="text-sm text-muted-strong">{p.detailedDescription}</p>

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <Stat icon={<Users className="w-3 h-3" />} label="Networking" value={p.networkingValue} />
        <Stat icon={<Award className="w-3 h-3" />} label="Portfolio" value={p.portfolioValue} />
      </div>

      {p.likelyTopics && p.likelyTopics.length > 0 && (
        <div>
          <div className="label mb-1 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Likely topics</div>
          <div className="flex flex-wrap gap-1.5">
            {p.likelyTopics.map((t) => <span key={t} className="badge">{t}</span>)}
          </div>
        </div>
      )}

      {p.likelyAttendees && p.likelyAttendees.length > 0 && (
        <div>
          <div className="label mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Likely attendees</div>
          <div className="flex flex-wrap gap-1.5">
            {p.likelyAttendees.map((t) => <span key={t} className="badge">{t}</span>)}
          </div>
        </div>
      )}

      {(p.prizes || p.evaluationCriteria) && (
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          {p.prizes && (
            <div className="border border-border rounded-lg p-2">
              <div className="label mb-1">Prizes</div>
              <div className="text-muted-strong">{p.prizes}</div>
            </div>
          )}
          {p.evaluationCriteria && (
            <div className="border border-border rounded-lg p-2">
              <div className="label mb-1">Evaluation</div>
              <div className="text-muted-strong">{p.evaluationCriteria}</div>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="label mb-1 flex items-center gap-1"><Wand2 className="w-3 h-3" /> Suggested prep</div>
        <ul className="text-xs text-muted-strong list-disc list-inside space-y-0.5">
          {p.suggestedPrep.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>

      {p.suggestedProjectAngle && (
        <p className="text-xs italic text-muted">
          Project angle: {p.suggestedProjectAngle}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-accent-glow inline-flex items-center gap-1 hover:underline">
          View source <ExternalLink className="w-3 h-3" />
        </a>
        <ActionButtons opportunityId={opp._id!} kind="event" status={opp.status} />
      </div>
    </article>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 border border-border rounded-lg p-2">
      <span className="text-accent">{icon}</span>
      <div className="flex-1">
        <div className="label">{label}</div>
        <div className="h-1.5 mt-1 rounded-full bg-bg-elevated overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent to-fuchsia-500" style={{ width: `${value}%` }} />
        </div>
      </div>
      <span className="text-xs text-muted-strong">{value}</span>
    </div>
  );
}
