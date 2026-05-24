import { NextRequest, NextResponse } from "next/server";
import { runEmailAgent } from "@/lib/agents/email";
import { findEmailByKey, insertEmail } from "@/lib/db/repos";
import { emailKey } from "@/lib/dedupe";
import { requireUserId, unauthorizedResponse } from "@/lib/auth-helpers";
import type { EmailDoc } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return unauthorizedResponse();
  }
  const body = await req.json();
  const subject = String(body.subject || "").trim();
  const sender = String(body.sender || "").trim();
  const text = String(body.body || "").trim();
  if (!subject || !sender || !text) {
    return NextResponse.json({ error: "subject, sender, body required" }, { status: 400 });
  }
  const dedupeKey = emailKey(subject, sender, new Date().toISOString());
  const existing = await findEmailByKey(userId, dedupeKey);
  if (existing) {
    return NextResponse.json({ email: existing, duplicate: true });
  }
  const analysis = await runEmailAgent({ subject, sender, body: text });
  const doc: Omit<EmailDoc, "_id"> = {
    userId,
    dedupeKey,
    subject,
    sender,
    body: text,
    bodySnippet: text.slice(0, 240),
    analysis,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  const saved = await insertEmail(doc);
  return NextResponse.json({ email: saved, duplicate: false });
}
