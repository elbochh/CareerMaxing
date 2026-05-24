import { ObjectId } from "mongodb";
import { tryGetDb } from "./mongo";

export interface UserRecord {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  provider: "credentials" | "google";
  image?: string;
  createdAt: string;
}

// In-memory fallback (used when MONGODB_URI is missing OR Mongo is unreachable)
declare global {
  // eslint-disable-next-line no-var
  var _usersMemory: Map<string, UserRecord> | undefined;
}
const memory: Map<string, UserRecord> = global._usersMemory || new Map();
global._usersMemory = memory;

function newId() {
  return new ObjectId().toString();
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function stripId<T extends { _id?: any }>(doc: T): T {
  if (doc && doc._id && typeof doc._id !== "string") {
    return { ...doc, _id: doc._id.toString() };
  }
  return doc;
}

function findInMemoryByEmail(email: string): UserRecord | null {
  for (const u of memory.values()) if (u.email === email) return u;
  return null;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const e = normalize(email);
  const db = await tryGetDb();
  if (!db) return findInMemoryByEmail(e);
  try {
    const doc = await db.collection<UserRecord>("users").findOne({ email: e });
    return doc ? stripId(doc) : null;
  } catch (err) {
    console.warn("[users] getUserByEmail mongo failed, falling back:", (err as Error).message);
    return findInMemoryByEmail(e);
  }
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const db = await tryGetDb();
  if (!db) return memory.get(id) || null;
  try {
    const doc = await db.collection<UserRecord>("users").findOne({ _id: id as any });
    return doc ? stripId(doc) : null;
  } catch {
    return memory.get(id) || null;
  }
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
  const db = await tryGetDb();
  if (!db) {
    memory.set(record._id, record);
    return record;
  }
  try {
    await db.collection<UserRecord>("users").insertOne(record as any);
    return record;
  } catch (err) {
    console.warn("[users] createUser mongo failed, falling back:", (err as Error).message);
    memory.set(record._id, record);
    return record;
  }
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
    passwordHash: "",
    provider: "google",
    image: input.image,
  });
}
