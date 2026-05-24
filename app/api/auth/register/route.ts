import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail } from "@/lib/db/users";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(64),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid input";
    return NextResponse.json({ error: "invalid_input", message }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "email_taken", message: "An account with this email already exists." },
      { status: 409 },
    );
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({ name, email, passwordHash });
  return NextResponse.json({
    ok: true,
    user: { id: user._id, email: user.email, name: user.name },
  });
}
