"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import type {
  CareerGoal,
  ExperienceLevel,
  LocationPref,
  OpportunityType,
  PrimaryDomain,
  UserProfile,
} from "@/types";
import { cn } from "@/lib/utils";
import { ScheduleEditor } from "@/components/ScheduleEditor";

const DOMAINS: PrimaryDomain[] = [
  "AI general",
  "Agentic AI",
  "Machine Learning",
  "Data Science",
  "Generative AI",
  "NLP",
  "Computer Vision",
  "AI Automation",
  "MLOps",
  "AI Product",
];

const LOCATIONS: LocationPref[] = ["Calgary", "Alberta", "Canada", "Remote", "Online"];
const OPP_TYPES: OpportunityType[] = [
  "jobs",
  "internships",
  "hackathons",
  "networking events",
  "competitions",
  "courses",
  "certificates",
];
const GOALS: CareerGoal[] = [
  "get internship",
  "build portfolio",
  "learn AI",
  "network",
  "prepare for interviews",
  "find hackathons",
];
const SKILL_SUGGESTIONS = [
  "Python",
  "SQL",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "scikit-learn",
  "PyTorch",
  "TensorFlow",
  "LangChain",
  "OpenAI API",
  "Tableau",
  "Docker",
  "AWS",
];
function ChipToggle<T extends string>({
  label,
  value,
  selected,
  onToggle,
}: {
  label: string;
  value: T;
  selected: boolean;
  onToggle: (v: T) => void;
}) {
  return (
    <button
      type="button"
      className={selected ? "chip-on" : "chip"}
      onClick={() => onToggle(value)}
    >
      {label}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [form, setForm] = useState<UserProfile>({
    userId: "local-user",
    name: "",
    school: "",
    level: "beginner",
    primaryDomain: "Agentic AI",
    locations: ["Calgary", "Remote"],
    opportunityTypes: ["jobs", "internships", "hackathons", "courses"],
    weeklyHours: 8,
    schedule: [],
    skills: ["Python"],
    careerGoals: ["get internship", "build portfolio"],
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setForm(d.profile);
      })
      .finally(() => setHydrated(true));
  }, []);

  function toggleArr<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function save() {
    setLoading(true);
    try {
      const r = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Save failed");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Set up your AI career profile</h1>
        <p className="text-muted mt-2">
          The Domain Agent uses this to expand into the right subfields and queries. Takes ~60 seconds.
        </p>
      </div>

      {!hydrated && (
        <div className="card p-6 text-muted">
          <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> Loading profile…
        </div>
      )}

      {hydrated && (
        <div className="space-y-6">
          {/* Identity */}
          <section className="card p-6 space-y-4">
            <h2 className="section-title">About you</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="label mb-1">Name</div>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Alex"
                />
              </div>
              <div>
                <div className="label mb-1">School / program (optional)</div>
                <input
                  className="input"
                  value={form.school || ""}
                  onChange={(e) => setForm({ ...form, school: e.target.value })}
                  placeholder="University of Calgary, CPSC"
                />
              </div>
            </div>
            <div>
              <div className="label mb-2">Experience level</div>
              <div className="flex gap-2">
                {(["beginner", "intermediate", "advanced"] as ExperienceLevel[]).map((lv) => (
                  <ChipToggle
                    key={lv}
                    label={lv}
                    value={lv}
                    selected={form.level === lv}
                    onToggle={(v) => setForm({ ...form, level: v as ExperienceLevel })}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Domain */}
          <section className="card p-6 space-y-4">
            <h2 className="section-title">Your AI focus</h2>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((d) => (
                <ChipToggle
                  key={d}
                  label={d}
                  value={d}
                  selected={form.primaryDomain === d}
                  onToggle={(v) => setForm({ ...form, primaryDomain: v as PrimaryDomain })}
                />
              ))}
            </div>
            <p className="text-xs text-muted">
              We expand this into 15+ related subfields automatically (e.g. Agentic AI → LangChain, LangGraph, RAG, multi-agent, tool calling…).
            </p>
          </section>

          {/* Location + Opportunity types */}
          <section className="card p-6 space-y-4">
            <h2 className="section-title">Location & opportunities</h2>
            <div>
              <div className="label mb-2">Locations you'll consider</div>
              <div className="flex flex-wrap gap-2">
                {LOCATIONS.map((l) => (
                  <ChipToggle
                    key={l}
                    label={l}
                    value={l}
                    selected={form.locations.includes(l)}
                    onToggle={(v) => setForm({ ...form, locations: toggleArr(form.locations, v) })}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-2">Opportunity types</div>
              <div className="flex flex-wrap gap-2">
                {OPP_TYPES.map((t) => (
                  <ChipToggle
                    key={t}
                    label={t}
                    value={t}
                    selected={form.opportunityTypes.includes(t)}
                    onToggle={(v) =>
                      setForm({ ...form, opportunityTypes: toggleArr(form.opportunityTypes, v) })
                    }
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Time budget */}
          <section className="card p-6 space-y-4">
            <h2 className="section-title">Weekly hours</h2>
            <div className="grid md:grid-cols-2 gap-4 items-center">
              <div>
                <div className="label mb-1">Weekly available hours: {form.weeklyHours}h</div>
                <input
                  type="range"
                  min={2}
                  max={30}
                  value={form.weeklyHours}
                  onChange={(e) => setForm({ ...form, weeklyHours: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
                <p className="text-[11px] text-muted mt-2">
                  The Checklist Agent will never schedule more than {form.weeklyHours}h of tasks per week, and will avoid your class times below.
                </p>
              </div>
            </div>
          </section>

          {/* School schedule */}
          <section className="card p-6 space-y-4">
            <h2 className="section-title">School schedule</h2>
            <p className="text-xs text-muted">
              Upload a screenshot of your weekly timetable (OpenAI Vision will read it) or add classes manually. These blocks are protected — the agent will not schedule tasks over them.
            </p>
            <ScheduleEditor
              slots={form.schedule}
              onChange={(slots) => setForm({ ...form, schedule: slots })}
            />
          </section>

          {/* Skills */}
          <section className="card p-6 space-y-4">
            <h2 className="section-title">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {SKILL_SUGGESTIONS.map((s) => (
                <ChipToggle
                  key={s}
                  label={s}
                  value={s}
                  selected={form.skills.includes(s)}
                  onToggle={(v) => setForm({ ...form, skills: toggleArr(form.skills, v) })}
                />
              ))}
            </div>
          </section>

          {/* Goals */}
          <section className="card p-6 space-y-4">
            <h2 className="section-title">Career goals</h2>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <ChipToggle
                  key={g}
                  label={g}
                  value={g}
                  selected={form.careerGoals.includes(g)}
                  onToggle={(v) => setForm({ ...form, careerGoals: toggleArr(form.careerGoals, v) })}
                />
              ))}
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            <button
              className={cn("btn-primary px-5 py-3", loading && "opacity-60")}
              onClick={save}
              disabled={loading || !form.name}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Save and continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
