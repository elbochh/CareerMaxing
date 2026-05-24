"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Briefcase,
  CalendarRange,
  GraduationCap,
  ListChecks,
  Sparkles,
  Bot,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Briefcase,
    title: "AI Job Discovery",
    body: "We expand your AI focus into the right job titles and score every match by skills, level, and location.",
    status: "Active Tracking",
    tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: CalendarRange,
    title: "Events & Hackathons",
    body: "Alberta + remote events ranked by portfolio and networking value. Hackathons get prep blueprints.",
    status: "Live Devpost feed",
    tagColor: "bg-[#5AB9EA]/10 text-[#5680E9] border-[#5AB9EA]/30",
  },
  {
    icon: GraduationCap,
    title: "Learning Center",
    body: "An 8-week beginner path for Agentic AI plus curated courses for ML, NLP, CV, MLOps, and more.",
    status: "Module 3 of 8",
    tagColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    icon: ListChecks,
    title: "Weekly Checklist",
    body: "Approved opportunities turn into Mon–Sun tasks around your school schedule and weekly hours.",
    status: "Mon–Sun Track",
    tagColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
];

export default function LandingPage() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user?.id;
  const primaryHref = isLoggedIn ? "/onboarding" : "/signup";
  const secondaryHref = isLoggedIn ? "/dashboard" : "/login";
  const secondaryLabel = isLoggedIn ? "View Dashboard" : "Log In";

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in relative">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl p-8 md:p-12 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row items-center justify-between gap-8 group">
        <div className="space-y-5 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#5AB9EA]/10 text-[#5680E9] border border-[#5AB9EA]/30 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#5AB9EA]" />
            <span>Built for AI engineering students</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-800 leading-tight">
            Your daily{" "}
            <span className="bg-gradient-to-r from-[#5680E9] via-[#5AB9EA] to-[#8860D0] bg-clip-text text-transparent">
              AI career agent
            </span>
            .
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl font-medium">
            CareerMaxing maps out tailored AI jobs, local events, hackathons, and structured technical
            frameworks aligned around your school schedule.
            <span className="block mt-2 font-black text-[#5680E9]">One scan a day, zero noise.</span>
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#5680E9] to-[#8860D0] hover:shadow-lg transition-all"
            >
              {isLoggedIn ? "Start Career Scan" : "Create Free Account"}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-white border border-slate-200 text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>

        <div className="w-full md:w-72 bg-white border border-slate-200 rounded-2xl p-6 relative z-10 flex flex-col justify-between h-48 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              System Metric
            </span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1">
              <Activity className="w-3 h-3 animate-pulse" /> Live
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
              Career Readiness Score
            </div>
            <div className="text-4xl font-black text-slate-800 tracking-tight flex items-baseline gap-1">
              85<span className="text-sm font-bold text-[#5AB9EA]">%</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
            <div className="bg-gradient-to-r from-[#5680E9] via-[#5AB9EA] to-[#8860D0] h-full w-[85%] rounded-full" />
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-5 gap-6 items-stretch">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:border-[#5AB9EA]/60 transition-all">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-[#5680E9]/10 border border-[#5680E9]/20 text-[#5680E9]">
                <Bot className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                Multi-agent AI architecture
              </h2>
            </div>
            <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
              A domain-aware background engine processes active positions across technical categories.
              Discovery vectors automatically evaluate listings against current milestones, eliminating
              processing redundancies while maintaining conflict-free weekly task arrays.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Parallel telemetry optimizations active
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col justify-between gap-3">
          {[
            {
              k: "Real job feed",
              v: "Remotive (free)",
              type: "bg-emerald-50 text-emerald-700 border-emerald-200",
            },
            {
              k: "Live hackathons",
              v: "Devpost API",
              type: "bg-[#5AB9EA]/10 text-[#5680E9] border-[#5AB9EA]/30",
            },
            {
              k: "Dedup across scans",
              v: "URL guard tracking",
              type: "bg-slate-100 text-slate-600 border-slate-200",
            },
            {
              k: "Real schedule aware",
              v: "Respects academic blocks",
              type: "bg-amber-50 text-amber-700 border-amber-200",
            },
          ].map((row) => (
            <div
              key={row.k}
              className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm transition-all hover:border-[#5AB9EA]/40 group"
            >
              <span className="text-sm font-bold text-slate-700 transition-colors">{row.k}</span>
              <span
                className={cn(
                  "text-[11px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wide",
                  row.type,
                )}
              >
                {row.v}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight sm:text-2xl">
              Inside CareerMaxing
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold">
              Interactive agent micro-modules customized directly for your pipeline.
            </p>
          </div>
          <span className="text-xs text-[#5680E9] font-mono font-bold tracking-wider uppercase bg-[#5680E9]/5 px-2.5 py-1 rounded-lg border border-[#5680E9]/20 shadow-xs self-start sm:self-center">
            4 Core Operations Running
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.title}
                href={isLoggedIn ? "/dashboard" : "/login"}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between relative group overflow-hidden shadow-sm hover:shadow-md hover:border-[#5AB9EA]/50 transition-all"
              >
                <div>
                  <div className="w-full flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 group-hover:bg-[#5680E9]/10 group-hover:border-[#5680E9]/20 group-hover:text-[#5680E9] transition-all duration-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wide",
                        f.tagColor,
                      )}
                    >
                      {f.status}
                    </span>
                  </div>

                  <h3 className="text-slate-800 font-black text-base mb-1.5 flex items-center gap-1 group-hover:text-[#5680E9] transition-colors">
                    {f.title}
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all text-[#5680E9]" />
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">{f.body}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="relative rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center overflow-hidden shadow-sm">
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">
          Ready to maximize your AI career?
        </h3>
        <p className="text-slate-500 text-sm mt-1.5 max-w-sm mx-auto font-medium">
          Set up your system profile metrics configuration in under a minute and execute scans.
        </p>
        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 mt-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#5680E9] to-[#8860D0] shadow-md hover:scale-102 transition-all"
        >
          {isLoggedIn ? "Start Career Scan" : "Create Free Account"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
