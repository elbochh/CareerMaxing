import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchGmailOpportunities } from "@/lib/services/gmail";
import { runEmailAgent } from "@/lib/agents/email";
import { findEmailByKey, insertEmail } from "@/lib/db/repos";
import { emailKey } from "@/lib/dedupe";
import { DEFAULT_USER_ID, type EmailDoc } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "gmail_not_configured" }, { status: 400 });
  }
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json(
      { error: "sign_in_required", signInUrl: "/api/auth/signin/google" },
      { status: 401 },
    );
  }
  const messages = await fetchGmailOpportunities(accessToken, 10);
  let added = 0;
  for (const m of messages) {
    const dedupeKey = emailKey(m.subject, m.sender, m.date) || m.id;
    const existing = await findEmailByKey(DEFAULT_USER_ID, dedupeKey);
    if (existing) continue;
    try {
      const analysis = await runEmailAgent({
        subject: m.subject,
        sender: m.sender,
        body: m.snippet, // snippet-only by design
      });
      const doc: Omit<EmailDoc, "_id"> = {
        userId: DEFAULT_USER_ID,
        dedupeKey,
        subject: m.subject,
        sender: m.sender,
        body: m.snippet,
        bodySnippet: m.snippet,
        analysis,
        status: "new",
        createdAt: new Date().toISOString(),
      };
      await insertEmail(doc);
      added++;
    } catch (err) {
      console.warn("[gmail] analyze failed:", (err as Error).message);
    }
  }
  return NextResponse.json({ processed: messages.length, added });
}
