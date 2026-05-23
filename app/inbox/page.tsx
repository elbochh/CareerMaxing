"use client";

import { useEffect, useState } from "react";
import { Inbox, Loader2, Sparkles, Wand2, Mail } from "lucide-react";
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
    const r = await fetch("/api/emails");
    const data = await r.json();
    setEmails(data.emails);
    setLoading(false);
  }
  async function loadIntegrations() {
    const r = await fetch("/api/integrations");
    const data = await r.json();
    setGmailEnabled(data.gmail);
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
        setGmailMsg(data.error || "Gmail scan failed");
      } else {
        setGmailMsg(`Gmail scan: ${data.processed} processed, ${data.added} new.`);
        await load();
      }
    } catch (e) {
      setGmailMsg((e as Error).message);
    } finally {
      setGmailScanning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Opportunity Inbox</h1>
        <p className="text-muted mt-1">
          Paste any email below — the Email Agent detects career value, interviews, and suggested actions. Nothing is auto-added to your checklist until you click <span className="text-accent-glow">Follow this</span>.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5 md:col-span-2 space-y-3">
          <h2 className="section-title flex items-center gap-2"><Mail className="w-4 h-4 text-accent" /> Paste an email</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            <input
              className="input"
              placeholder="From (e.g. recruiting@helcim.com)"
              value={form.sender}
              onChange={(e) => setForm({ ...form, sender: e.target.value })}
            />
          </div>
          <textarea
            className="input min-h-[150px]"
            placeholder="Paste the email body here…"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {DEMO_EMAILS.map((d, i) => (
                <button key={i} onClick={() => loadDemo(i)} className="chip">
                  Demo: {d.subject.length > 30 ? d.subject.slice(0, 30) + "…" : d.subject}
                </button>
              ))}
            </div>
            <button
              onClick={scan}
              disabled={scanning || !form.subject || !form.sender || !form.body}
              className="btn-primary"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Analyze email
            </button>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="section-title flex items-center gap-2"><Inbox className="w-4 h-4 text-accent" /> Gmail Scanner</h2>
          {gmailEnabled ? (
            <>
              <p className="text-xs text-muted">
                Scans last 30 days for: interview, internship, scholarship, hackathon, career fair, workshop, networking, mentorship, volunteer, student membership, or job opportunity.
              </p>
              <button
                onClick={scanGmail}
                disabled={gmailScanning}
                className="btn-primary w-full"
              >
                {gmailScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Scan my Gmail
              </button>
              <p className="text-[10px] text-muted">Read-only. We never store full bodies, only snippets + analysis.</p>
            </>
          ) : (
            <p className="text-xs text-muted">
              Gmail integration is not configured. Set <code className="text-muted-strong">GOOGLE_CLIENT_ID</code> and <code className="text-muted-strong">GOOGLE_CLIENT_SECRET</code> in <code className="text-muted-strong">.env.local</code> to enable it. Manual paste below works without any configuration.
            </p>
          )}
          {gmailMsg && <p className="text-xs text-muted-strong">{gmailMsg}</p>}
        </div>
      </div>

      <div>
        <h2 className="section-title mb-3">Analyzed emails</h2>
        {loading ? (
          <div className="card p-6 text-muted">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
          </div>
        ) : emails.length === 0 ? (
          <div className="card p-10 text-center">
            <Mail className="w-5 h-5 text-accent mx-auto mb-2" />
            <p className="text-muted-strong">No emails yet. Try one of the demo emails above.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {emails.map((e) => <EmailCard key={e._id} email={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}
