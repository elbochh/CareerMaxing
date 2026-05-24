"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Briefcase, CalendarRange, GraduationCap, ListChecks, Sparkles, Target, Trophy } from "lucide-react";
import { ScanButton } from "@/components/ScanButton";
import { ScoreBadge } from "@/components/ScoreBadge";
import { XPBar } from "@/components/XPBar";
import type { EventPayload, JobPayload, OpportunityDoc, TaskDoc, UserProfile } from "@/types";
import { formatScore } from "@/lib/utils";

interface DashData {
  profile: UserProfile | null;
  domain: { primaryDomain: string; expandedSubfields: string[] } | null;
  careerMaxingScore: number;
  counts: {
    jobsNew: number;
    eventsNew: number;
    coursesNew: number;
    jobsApproved: number;
    eventsApproved: number;
    coursesApproved: number;
  };
  xp: { earned: number; total: number };
  topJobs: OpportunityDoc<JobPayload>[];
  topEvents: OpportunityDoc<EventPayload>[];
  upcoming: TaskDoc[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);

  async function loadDashboard() {
    const r = await fetch("/api/dashboard");
    const nextData = await r.json();
    setData(nextData);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (!data) {
    return <div className="text-muted">Loading…</div>;
  }

  if (!data.profile) {
    return (
      <div className="card p-8 text-center">
        <Sparkles className="w-6 h-6 text-accent mx-auto mb-3" />
        <h2 className="section-title">Welcome to CareerMaxing</h2>
        <p className="text-muted mt-2 mb-5">Create your profile so the agents know what to look for.</p>
        <Link href="/onboarding" className="btn-primary">
          Set up profile <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const greet = data.profile.name ? `Hey ${data.profile.name.split(" ")[0]}!` : "Hey there!";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{greet}</h1>
          <p className="text-muted mt-1">
            Focus: <span className="text-accent-glow">{data.profile.primaryDomain}</span> · {data.profile.weeklyHours}h/week
          </p>
        </div>
        <ScanButton size="lg" onComplete={loadDashboard} />
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="CareerMaxing Score" value={data.careerMaxingScore} icon={<Trophy className="w-4 h-4" />} suffix="/100" />
        <StatCard label="Jobs" value={data.counts.jobsNew} icon={<Briefcase className="w-4 h-4" />} sub={`${data.counts.jobsApproved} approved`} href="/jobs" />
        <StatCard label="Events" value={data.counts.eventsNew} icon={<CalendarRange className="w-4 h-4" />} sub={`${data.counts.eventsApproved} approved`} href="/events" />
        <StatCard label="Courses" value={data.counts.coursesNew} icon={<GraduationCap className="w-4 h-4" />} sub={`${data.counts.coursesApproved} approved`} href="/learning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Top recommended actions</h2>
            <Link href="/jobs" className="text-xs text-accent-glow inline-flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {data.topJobs.length === 0 && data.topEvents.length === 0 ? (
            <EmptyHint />
          ) : (
            <div className="space-y-3">
              {data.topJobs.map((j) => (
                <RecRow
                  key={j._id}
                  icon={<Briefcase className="w-4 h-4 text-accent" />}
                  title={j.payload.title}
                  sub={`${j.payload.company} · ${j.payload.location}`}
                  score={j.score}
                  band={j.scoreBand}
                  href="/jobs"
                />
              ))}
              {data.topEvents.map((e) => (
                <RecRow
                  key={e._id}
                  icon={<CalendarRange className="w-4 h-4 text-accent" />}
                  title={e.payload.title}
                  sub={`${e.payload.organizer} · ${e.payload.isOnline ? "Online" : e.payload.location}`}
                  score={e.score}
                  band={e.scoreBand}
                  href="/events"
                />
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="section-title flex items-center gap-2"><ListChecks className="w-4 h-4 text-accent" /> Weekly progress</h2>
          <XPBar earned={data.xp.earned} total={data.xp.total} />
          <Link href="/checklist" className="btn-ghost w-full">
            Open weekly checklist <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <div className="label mb-2">Upcoming deadlines</div>
            {data.upcoming.length === 0 ? (
              <p className="text-xs text-muted">No deadlines yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.upcoming.map((t) => (
                  <li key={t._id} className="text-sm flex justify-between items-center">
                    <span className="truncate text-muted-strong">{t.title}</span>
                    <span className="text-xs text-muted">{t.dueDate?.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {data.domain && (
        <div className="card p-5">
          <h3 className="section-title flex items-center gap-2"><Target className="w-4 h-4 text-accent" /> Domain expansion</h3>
          <p className="text-xs text-muted mt-1 mb-3">
            Domain Agent expanded <span className="text-accent-glow">{data.domain.primaryDomain}</span> into:
          </p>
          <div className="flex flex-wrap gap-2">
            {data.domain.expandedSubfields.map((s) => (
              <span key={s} className="badge">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, suffix, sub, href }: { label: string; value: number; icon: React.ReactNode; suffix?: string; sub?: string; href?: string }) {
  const inner = (
    <div className="card card-hover p-4">
      <div className="flex items-center justify-between text-muted text-xs">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-800">
        {formatScore(value)}
        {suffix && <span className="text-base text-muted ml-1">{suffix}</span>}
      </div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function RecRow({ icon, title, sub, score, band, href }: { icon: React.ReactNode; title: string; sub: string; score: number; band: any; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-border-strong transition-colors">
      <div className="w-8 h-8 rounded-lg bg-bg-elevated grid place-items-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-800 truncate">{title}</div>
        <div className="text-xs text-muted truncate">{sub}</div>
      </div>
      <ScoreBadge score={score} band={band} />
    </Link>
  );
}

function EmptyHint() {
  return (
    <div className="text-center py-8 border border-dashed border-border rounded-xl">
      <Activity className="w-5 h-5 text-accent mx-auto mb-2" />
      <p className="text-sm text-muted-strong">No opportunities yet — run your first Career Scan above.</p>
    </div>
  );
}
