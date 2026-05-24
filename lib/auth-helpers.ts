import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/db/users";
import type { CurrentUser } from "@/lib/profile";

/**
 * Returns the current app user if they have an active session.
 * Throws a typed error if not authenticated. Use try/catch in routes.
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const session = await getServerSession(authOptions);
  let id = session?.user?.id;
  if (!session?.user) {
    const e: any = new Error("unauthorized");
    e.statusCode = 401;
    throw e;
  }

  if (session.user.email) {
    const user = await getUserByEmail(session.user.email);
    if (user) id = user._id;
  }

  if (!id) {
    const e: any = new Error("unauthorized");
    e.statusCode = 401;
    throw e;
  }

  return {
    id,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function requireUserId(): Promise<string> {
  const user = await requireCurrentUser();
  return user.id;
}

export async function maybeUserId(): Promise<string | null> {
  try {
    const user = await requireCurrentUser();
    return user.id;
  } catch {
    return null;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
