"use client";

import { useEffect, useState } from "react";
import { Inbox, Loader2, Sparkles, Wand2, Mail, Layers, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { EmailCard } from "@/components/EmailCard";
import type { EmailDoc } from "@/types";
import demoEmailsRaw from "@/seed/emails.json";

type DemoEmail = { subject: string; sender: string; body: string };
const DEMO_EMAILS = demoEmailsRaw as DemoEmail[];

export default function InboxPage() {
  const [emails, setEmails] = useState<EmailDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [gmailEnabled, setGmailEnabled] = useState(false);
  const [gmailScanning, setGmailScanning] = useState(false);
  const [gmailMsg, setGmailMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", sender: "", body: "" });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/emails");
      const data = await r.json();
      setEmails(data.emails || []);
    } catch (e) {
      console.error("Failed to fetch custom workspace emails:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadIntegrations() {
    try {
      const r = await fetch("/api/integrations");
      const data = await r.json();
      setGmailEnabled(data.gmail);
    } catch (e) {
      console.error("Failed loading integrations payload:", e);
    }
  }

  useEffect(() => {
    load();
    loadIntegrations();
  }, []);

  async function scan() {
    if (!form.subject || !form.sender || !form.body) return;
    setScanning(true);
    try {
      const r = await fetch("/api/email/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        setForm({ subject: "", sender: "", body: "" });
        await load();
      }
    } finally {
      setScanning(false);
    }
  }

  function loadDemo(idx: number) {
    const d = DEMO_EMAILS[idx];
    if (!d) return;
    setForm({ subject: d.subject, sender: d.sender, body: d.body });
  }

  async function scanGmail() {
    setGmailScanning(true);
    setGmailMsg(null);
    try {
      const r = await fetch("/api/gmail/opportunities");
      const data = await r.json();
      if (!r.ok) {
        setGmailMsg(data.error || "Gmail sync pipeline failure event.");
      } else {
        setGmailMsg(`Success: ${data.processed} sync passes compiled, ${data.added} additions matched.`);
        await load();
      }
    } catch (e) {
      setGmailMsg((e as Error).message);
    } finally {
      setGmailScanning(false);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in pb-12">
      
      {/* Header Canvas Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#C1C8E4]/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5680E9] tracking-wider uppercase">
            <Inbox className="w-3.5 h-3.5" />
            <span>Inbound Parser</span>
          </div>
          <h1 className="text-3xl font-black text-[#5680E9] tracking-tight sm:text-4xl">
            Opportunity Inbox
          </h1>
          <p className="text-slate-500 text-sm font-medium max-w-2xl">
            Drop raw message data below. The CareerMaxing agent strips text streams to map core career value nodes, key interviews, and recommended pipelines.
          </p>
        </div>
      </div>

      {/* Main Structural Hub Workspace Grid */}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        
        {/* Core Manual Email Drop Card Layout */}
        <div className="card p-6 md:col-span-2 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="section-title text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#8860D0]" /> 
              <span>Ingest Raw Document Stream</span>
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
              Manual Paste
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="label">Message Subject</label>
              <input
                className="input"
                placeholder="e.g. Interview Invitation or Offer Letter"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="label">Origin / Sender Header</label>
              <input
                className="input"
                placeholder="e.g. recruiting@company.com"
                value={form.sender}
                onChange={(e) => setForm({ ...form, sender: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="label">Full Email Content Block</label>
            <textarea
              className="input min-h-[160px] font-mono text-xs leading-relaxed resize-y"
              placeholder="Paste the entirety of your email body payload right here..."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>

          {/* Action Footer controls inside workspace card */}
          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 block">
                Sandbox Environment Demos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_EMAILS.map((d, i) => (
                  <button 
                    key={i} 
                    onClick={() => loadDemo(i)} 
                    className="chip bg-slate-50 border-[#C1C8E4]/40 hover:border-[#5AB9EA]/60 hover:bg-[#5AB9EA]/5 text-xs text-slate-600 font-medium rounded-lg transition-all"
                  >
                    {d.subject.length > 22 ? d.subject.slice(0, 22) + "…" : d.subject}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={scan}
              disabled={scanning || !form.subject || !form.sender || !form.body}
              className="btn-primary shrink-0 w-full sm:w-auto"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Parsing Node...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Analyze Stream</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Integration Right Sidebar Card Container */}
        <div className="card p-6 space-y-4 shadow-sm bg-gradient-to-b from-white to-slate-50/50">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="w-4 h-4 text-[#5AB9EA]" />
            <h2 className="text-sm font-bold text-[#5680E9] uppercase tracking-wider">Automated Webhook Sync</h2>
          </div>

          {gmailEnabled ? (
            <div className="space-y-4">
              <div className="p-3 bg-[#48cEEB]/10 rounded-xl border border-[#48cEEB]/20 flex gap-2.5">
                <Info className="w-4 h-4 text-[#21a1be] shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Looks back across the previous 30 days to cross-examine text strings containing matches like interview setups, career workshops, or hackathon tracking pipelines.
                </p>
              </div>

              <button
                onClick={scanGmail}
                disabled={gmailScanning}
                className="btn bg-[#5680E9] text-white hover:bg-[#436bc7] w-full shadow-sm text-xs py-3 font-bold uppercase tracking-wider transition-all rounded-xl flex items-center justify-center gap-2"
              >
                {gmailScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Indexing Gmail Logs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#48cEEB]" />
                    <span>Run Full Gmail Sync</span>
                  </>
                )}
              </button>
              
              <p className="text-[10px] text-slate-400 font-medium text-center italic">
                Read-only pipeline. Core bodies are discarded immediately post-evaluation.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-[#C1C8E4] bg-white space-y-3">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>Integration Offline</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Gmail API integration variables are missing. Configure <code className="bg-slate-100 px-1 rounded font-mono text-[10px] font-bold text-slate-700">GOOGLE_CLIENT_ID</code> inside your environment configuration array to initiate automated listeners.
              </p>
            </div>
          )}

          {/* Sync Status Toast Box Notification Area inside sidebar */}
          {gmailMsg && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 animate-fade-in ${
              gmailMsg.toLowerCase().includes("failed") || gmailMsg.toLowerCase().includes("failure")
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}>
              {gmailMsg.toLowerCase().includes("failed") ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{gmailMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Compiled Results Section Feed Canvas */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-[#5680E9] tracking-tight">
            Analyzed Workspace Logs
          </h2>
          <span className="px-2 py-0.5 text-[10px] font-black bg-[#5AB9EA]/10 border border-[#5AB9EA]/30 text-[#5680E9] rounded-md">
            {emails.length} Records
          </span>
        </div>
        
        {loading ? (
          <div className="card p-16 text-center flex flex-col items-center justify-center gap-3 border-dashed border-2">
            <div className="p-4 bg-[#5AB9EA]/10 rounded-full text-[#5680E9]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <p className="text-sm font-bold text-slate-500 tracking-wide">
              De-serializing document maps and extracting attributes...
            </p>
          </div>
        ) : emails.length === 0 ? (
          <div className="card p-12 text-center max-w-xl mx-auto border-2 border-dashed border-[#C1C8E4]/60 bg-white/50 backdrop-blur-sm shadow-md flex flex-col items-center justify-center">
            <div className="p-4 bg-[#8860D0]/10 text-[#8860D0] rounded-2xl mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#5680E9] tracking-tight">Workspace Inbox Clean</h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xs font-medium leading-relaxed">
              No structural email telemetry found inside this session log. Execute a code snippet demo array to test.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 group/feed">
            {emails.map((e) => (
              <div 
                key={e._id} 
                className="transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5"
              >
                <EmailCard email={e} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}