import { format } from "date-fns";
import { CalendarPlus, CalendarRange, Download, ExternalLink, MapPin, Globe, Award, Users, Lightbulb, Wand2 } from "lucide-react";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ActionButtons } from "@/components/ActionButtons";
import { defaultDurationMinutesForEvent } from "@/lib/events/config";
import type { EventPayload, OpportunityDoc } from "@/types";

const URGENCY_BADGE: Record<EventPayload["urgency"], string> = {
  high: "badge-danger",
  medium: "badge-warn",
  low: "badge",
};

interface CalendarLinks {
  googleUrl: string;
  icsHref: string;
  filename: string;
}

function toUtcCalendarStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() || "event";
}

function buildCalendarLinks(payload: EventPayload): CalendarLinks | null {
  const start = new Date(payload.date);
  if (Number.isNaN(start.getTime())) return null;

  const durationMinutes = payload.durationMinutes ?? defaultDurationMinutesForEvent(payload.eventType);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const startStamp = toUtcCalendarStamp(start);
  const endStamp = toUtcCalendarStamp(end);
  const description = `${payload.detailedDescription}\n\nSource: ${payload.url}`;
  const location = payload.isOnline ? "Online" : payload.location;

  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: payload.title,
    dates: `${startStamp}/${endStamp}`,
    details: description,
    location,
  });

  const uid = `${safeFileName(payload.title)}-${startStamp}@careermaxing.local`;
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareerMaxing//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toUtcCalendarStamp(new Date())}`,
    `DTSTART:${startStamp}`,
    `DTEND:${endStamp}`,
    `SUMMARY:${escapeIcsText(payload.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `URL:${payload.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    googleUrl: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    icsHref: `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`,
    filename: `${safeFileName(payload.title)}.ics`,
  };
}

export function EventCard({ opp }: { opp: OpportunityDoc<EventPayload> }) {
  const p = opp.payload;
  const calendarLinks = buildCalendarLinks(p);
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
          <h3 className="text-white font-semibold leading-tight">{p.title}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1">
            <span className="badge">{p.eventType}</span>
            <span className="inline-flex items-center gap-1"><CalendarRange className="w-3 h-3" />{date}</span>
            <span className="inline-flex items-center gap-1">
              {p.isOnline ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
              {p.isOnline ? "Online" : p.location}
            </span>
            <span className="badge">{p.source}</span>
            <span className={URGENCY_BADGE[p.urgency]}>{p.urgency} urgency</span>
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
        <div className="flex flex-wrap items-center gap-3">
          <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-accent-glow inline-flex items-center gap-1 hover:underline">
            View source <ExternalLink className="w-3 h-3" />
          </a>
          {calendarLinks && (
            <>
              <a
                href={calendarLinks.googleUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent-glow inline-flex items-center gap-1 hover:underline"
              >
                Add to Google <CalendarPlus className="w-3 h-3" />
              </a>
              <a
                href={calendarLinks.icsHref}
                download={calendarLinks.filename}
                className="text-xs text-accent-glow inline-flex items-center gap-1 hover:underline"
              >
                Download .ics <Download className="w-3 h-3" />
              </a>
            </>
          )}
        </div>
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
