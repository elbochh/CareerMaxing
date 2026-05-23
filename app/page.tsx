import Link from "next/link";
import { ArrowRight, Briefcase, CalendarRange, GraduationCap, Inbox, ListChecks, Sparkles, Bot } from "lucide-react";

const FEATURES = [
  {
    icon: Briefcase,
    title: "AI Job Discovery",
    body: "We expand your AI focus into the right job titles and score every match by skills, level, and location.",
  },
  {
    icon: CalendarRange,
    title: "Events & Hackathons",
    body: "Alberta + remote events ranked by portfolio and networking value. Hackathons get prep blueprints.",
  },
  {
    icon: GraduationCap,
    title: "Learning Center",
    body: "An 8-week beginner path for Agentic AI plus curated courses for ML, NLP, CV, MLOps, and more.",
  },
  {
    icon: Inbox,
    title: "Gmail Scanner",
    body: "Paste an email or connect Gmail. We detect interviews, offers, and events — never auto-create tasks.",
  },
  {
    icon: ListChecks,
    title: "Weekly Checklist",
    body: "Approved opportunities turn into Mon–Sun tasks around your school schedule and weekly hours.",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="pt-12 pb-6 text-center">
        <div className="inline-flex items-center gap-2 badge-accent mb-6">
          <Sparkles className="w-3 h-3" />
          Built in 48 hours for AI students
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Your daily <span className="hero-grad">AI career agent</span>.
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-muted text-lg">
          CareerMaxing finds AI jobs, events, hackathons, and learning paths tailored to your goals, school schedule, and weekly hours.
          One scan a day, zero noise.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/onboarding" className="btn-primary px-5 py-3 text-base">
            Start Career Scan
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/dashboard" className="btn-ghost px-5 py-3 text-base">
            View Dashboard
          </Link>
        </div>
      </section>

      {/* Architecture pitch */}
      <section className="grid md:grid-cols-2 gap-6 items-center">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Bot className="w-5 h-5 text-accent" />
            <span className="section-title">Multi-agent AI architecture</span>
          </div>
          <p className="text-muted">
            A Domain Agent expands your AI focus into subfields and search queries. Three discovery agents (Jobs / Events / Learning) score every opportunity, with deduplication across daily scans. An Email Agent detects interviews. A Checklist Agent turns approvals into a realistic weekly plan around your school schedule.
          </p>
        </div>
        <div className="card p-6 space-y-3">
          {[
            { k: "Mock-first demo", v: "Works without any API keys" },
            { k: "Cost optimized", v: "gpt-4o-mini, batched calls, cached domain expansion" },
            { k: "Dedup across scans", v: "Normalized keys + source URL guard" },
            { k: "Real schedule aware", v: "Tasks respect school blocks + weekly hours" },
          ].map((row) => (
            <div key={row.k} className="flex items-center justify-between">
              <span className="text-muted-strong text-sm">{row.k}</span>
              <span className="badge-accent">{row.v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section>
        <h2 className="section-title mb-6">Inside CareerMaxing</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card card-hover p-5 animate-slide-up">
                <Icon className="w-5 h-5 text-accent mb-3" />
                <h3 className="text-white font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-8 text-center">
        <h3 className="text-2xl font-semibold text-white">Ready to maximize your AI career?</h3>
        <p className="text-muted mt-2">Set up your profile in under a minute.</p>
        <Link href="/onboarding" className="btn-primary mt-5 px-5 py-3 text-base">
          Start Career Scan <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
