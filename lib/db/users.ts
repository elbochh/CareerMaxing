import { ObjectId } from "mongodb";
import { getDb, isDbConfigured } from "./mongo";

export interface UserRecord {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  provider: "credentials" | "google";
  image?: string;
  createdAt: string;
}

// In-memory fallback (only when MONGODB_URI is missing)
const memory = new Map<string, UserRecord>();

function newId() {
  return new ObjectId().toString();
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const e = normalize(email);
  if (!isDbConfigured()) {
    for (const u of memory.values()) if (u.email === e) return u;
    return null;
  }
  const db = await getDb();
  const doc = await db.collection<UserRecord>("users").findOne({ email: e });
  return doc ? stripId(doc) : null;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  if (!isDbConfigured()) return memory.get(id) || null;
  const db = await getDb();
  const doc = await db.collection<UserRecord>("users").findOne({ _id: id as any });
  return doc ? stripId(doc) : null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  provider?: "credentials" | "google";
  image?: string;
}): Promise<UserRecord> {
  const now = new Date().toISOString();
  const record: UserRecord = {
    _id: newId(),
    name: input.name.trim(),
    email: normalize(input.email),
    passwordHash: input.passwordHash,
    provider: input.provider || "credentials",
    image: input.image,
    createdAt: now,
  };
  if (!isDbConfigured()) {
    memory.set(record._id, record);
    return record;
  }
  const db = await getDb();
  await db.collection<UserRecord>("users").insertOne(record as any);
  return record;
}

export async function ensureGoogleUser(input: {
  email: string;
  name?: string;
  image?: string;
}): Promise<UserRecord> {
  const existing = await getUserByEmail(input.email);
  if (existing) return existing;
  return createUser({
    name: input.name || input.email.split("@")[0],
    email: input.email,
    passwordHash: "", // OAuth user has no password
    provider: "google",
    image: input.image,
  });
}

function stripId<T extends { _id?: any }>(doc: T): T {
  if (doc && doc._id && typeof doc._id !== "string") {
    return { ...doc, _id: doc._id.toString() };
  }
  return doc;
}
