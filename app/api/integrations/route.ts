import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    gmail: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    llmEnabled: (process.env.LLM_ENABLED || "false").toLowerCase() === "true",
    useMock: (process.env.USE_MOCK_DATA || "true").toLowerCase() === "true",
  });
}
