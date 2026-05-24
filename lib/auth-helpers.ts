import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Returns the current user's id if they have an active session.
 * Throws a typed error if not authenticated. Use try/catch in routes.
 */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) {
    const e: any = new Error("unauthorized");
    e.statusCode = 401;
    throw e;
  }
  return id;
}

export async function maybeUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
