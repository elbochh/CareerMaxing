"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ScanButton({
  size = "md",
  onComplete,
}: {
  size?: "sm" | "md" | "lg";
  onComplete?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/scan", { method: "POST" });
      const data = await r.json();
      if (r.status === 401) {
        router.push("/login?callbackUrl=/dashboard");
        throw new Error("Please log in before running a scan.");
      }
      if (!r.ok) throw new Error(data.error || "Scan failed");
      const c = data.counts;
      const totalUpdated = c.jobs.updated + c.events.updated + c.courses.updated;
      const starter = data.profile?.created ? "Starter profile created. " : "";
      setResult(
        `${starter}Found ${c.jobs.found} jobs (${c.jobs.new} new), ${c.events.found} events (${c.events.new} new), ${c.courses.found} courses (${c.courses.new} new). Refreshed ${totalUpdated} existing matches for your current profile.`,
      );
      await onComplete?.();
      router.refresh();
    } catch (e) {
      setResult((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const padding = size === "lg" ? "px-5 py-3 text-base" : size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <div className="flex flex-col gap-2">
      <button onClick={run} disabled={loading} className={`btn-primary ${padding}`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        Run Career Scan
      </button>
      {result && (
        <p className="text-xs text-muted-strong animate-fade-in">{result}</p>
      )}
    </div>
  );
}
