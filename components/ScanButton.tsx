"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ScanButton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/scan", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Scan failed");
      const c = data.counts;
      setResult(
        `Found ${c.jobs.found} jobs (${c.jobs.new} new), ${c.events.found} events (${c.events.new} new), ${c.courses.found} courses (${c.courses.new} new).`,
      );
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
        Run Today's Career Scan
      </button>
      {result && (
        <p className="text-xs text-muted-strong animate-fade-in">{result}</p>
      )}
    </div>
  );
}
