import { ObjectId } from "mongodb";
import { getDb, isDbConfigured } from "./mongo";
import type {
  DomainExpansion,
  EmailDoc,
  OpportunityDoc,
  OpportunityKind,
  OpportunityStatus,
  TaskDoc,
  UserProfile,
} from "@/types";

// ---------------- In-memory fallback (used only if MONGODB_URI missing) ----------------
const memory = {
  profiles: new Map<string, UserProfile>(),
  domainExpansions: new Map<string, DomainExpansion>(),
  opportunities: new Map<string, OpportunityDoc>(),
  emails: new Map<string, EmailDoc>(),
  tasks: new Map<string, TaskDoc>(),
};

function newId() {
  return new ObjectId().toString();
}

// ---------------- Profiles ----------------
export async function getProfile(userId: string): Promise<UserProfile | null> {
  if (!isDbConfigured()) return memory.profiles.get(userId) || null;
  const db = await getDb();
  const doc = await db.collection<UserProfile>("profiles").findOne({ userId });
  return doc ? stripId(doc) : null;
}

export async function upsertProfile(profile: UserProfile): Promise<UserProfile> {
  const now = new Date().toISOString();
  const payload = { ...profile, updatedAt: now };
  if (!isDbConfigured()) {
    memory.profiles.set(profile.userId, payload);
    return payload;
  }
  const db = await getDb();
  await db
    .collection<UserProfile>("profiles")
    .updateOne({ userId: profile.userId }, { $set: payload }, { upsert: true });
  return payload;
}

// ---------------- Domain Expansion cache ----------------
export async function getDomainExpansion(userId: string): Promise<DomainExpansion | null> {
  if (!isDbConfigured()) return memory.domainExpansions.get(userId) || null;
  const db = await getDb();
  const doc = await db.collection<DomainExpansion>("domainExpansions").findOne({ userId });
  return doc ? stripId(doc) : null;
}

export async function saveDomainExpansion(exp: DomainExpansion): Promise<void> {
  if (!isDbConfigured()) {
    memory.domainExpansions.set(exp.userId, exp);
    return;
  }
  const db = await getDb();
  await db
    .collection<DomainExpansion>("domainExpansions")
    .updateOne({ userId: exp.userId }, { $set: exp }, { upsert: true });
}

// ---------------- Opportunities ----------------
export async function findOpportunityByKey(
  userId: string,
  kind: OpportunityKind,
  dedupeKey: string,
): Promise<OpportunityDoc | null> {
  if (!isDbConfigured()) {
    const key = `${userId}|${kind}|${dedupeKey}`;
    return memory.opportunities.get(key) || null;
  }
  const db = await getDb();
  const doc = await db
    .collection<OpportunityDoc>("opportunities")
    .findOne({ userId, kind, dedupeKey });
  return doc ? stripId(doc) : null;
}

export async function findOpportunityByUrl(
  userId: string,
  sourceUrl: string,
): Promise<OpportunityDoc | null> {
  if (!isDbConfigured()) {
    for (const v of memory.opportunities.values()) {
      if (v.userId === userId && v.sourceUrl === sourceUrl) return v;
    }
    return null;
  }
  const db = await getDb();
  const doc = await db
    .collection<OpportunityDoc>("opportunities")
    .findOne({ userId, sourceUrl });
  return doc ? stripId(doc) : null;
}

export async function insertOpportunity(
  doc: Omit<OpportunityDoc, "_id">,
): Promise<OpportunityDoc> {
  const withId: OpportunityDoc = { ...doc, _id: newId() };
  if (!isDbConfigured()) {
    const key = `${withId.userId}|${withId.kind}|${withId.dedupeKey}`;
    memory.opportunities.set(key, withId);
    return withId;
  }
  const db = await getDb();
  await db.collection<OpportunityDoc>("opportunities").insertOne(withId as any);
  return withId;
}

export async function listOpportunities(
  userId: string,
  kind: OpportunityKind,
  status?: OpportunityStatus,
): Promise<OpportunityDoc[]> {
  if (!isDbConfigured()) {
    return Array.from(memory.opportunities.values())
      .filter((o) => o.userId === userId && o.kind === kind && (!status || o.status === status))
      .sort((a, b) => b.score - a.score);
  }
  const db = await getDb();
  const filter: any = { userId, kind };
  if (status) filter.status = status;
  const docs = await db
    .collection<OpportunityDoc>("opportunities")
    .find(filter)
    .sort({ score: -1 })
    .toArray();
  return docs.map(stripId);
}

export async function countOpportunities(
  userId: string,
  kind: OpportunityKind,
  status?: OpportunityStatus,
): Promise<number> {
  if (!isDbConfigured()) {
    return Array.from(memory.opportunities.values()).filter(
      (o) => o.userId === userId && o.kind === kind && (!status || o.status === status),
    ).length;
  }
  const db = await getDb();
  const filter: any = { userId, kind };
  if (status) filter.status = status;
  return db.collection("opportunities").countDocuments(filter);
}

export async function getOpportunity(id: string): Promise<OpportunityDoc | null> {
  if (!isDbConfigured()) {
    for (const v of memory.opportunities.values()) if (v._id === id) return v;
    return null;
  }
  const db = await getDb();
  const doc = await db.collection<OpportunityDoc>("opportunities").findOne({ _id: id as any });
  return doc ? stripId(doc) : null;
}

export async function updateOpportunityStatus(
  id: string,
  status: OpportunityStatus,
): Promise<void> {
  const updatedAt = new Date().toISOString();
  if (!isDbConfigured()) {
    for (const v of memory.opportunities.values()) {
      if (v._id === id) {
        v.status = status;
        v.updatedAt = updatedAt;
      }
    }
    return;
  }
  const db = await getDb();
  await db
    .collection<OpportunityDoc>("opportunities")
    .updateOne({ _id: id as any }, { $set: { status, updatedAt } });
}

// ---------------- Emails ----------------
export async function findEmailByKey(
  userId: string,
  dedupeKey: string,
): Promise<EmailDoc | null> {
  if (!isDbConfigured()) {
    const k = `${userId}|${dedupeKey}`;
    return memory.emails.get(k) || null;
  }
  const db = await getDb();
  const doc = await db.collection<EmailDoc>("emails").findOne({ userId, dedupeKey });
  return doc ? stripId(doc) : null;
}

export async function insertEmail(doc: Omit<EmailDoc, "_id">): Promise<EmailDoc> {
  const withId: EmailDoc = { ...doc, _id: newId() };
  if (!isDbConfigured()) {
    memory.emails.set(`${withId.userId}|${withId.dedupeKey}`, withId);
    return withId;
  }
  const db = await getDb();
  await db.collection<EmailDoc>("emails").insertOne(withId as any);
  return withId;
}

export async function listEmails(userId: string): Promise<EmailDoc[]> {
  if (!isDbConfigured()) {
    return Array.from(memory.emails.values())
      .filter((e) => e.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  const db = await getDb();
  const docs = await db
    .collection<EmailDoc>("emails")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(stripId);
}

export async function getEmail(id: string): Promise<EmailDoc | null> {
  if (!isDbConfigured()) {
    for (const v of memory.emails.values()) if (v._id === id) return v;
    return null;
  }
  const db = await getDb();
  const doc = await db.collection<EmailDoc>("emails").findOne({ _id: id as any });
  return doc ? stripId(doc) : null;
}

export async function updateEmailStatus(id: string, status: OpportunityStatus): Promise<void> {
  if (!isDbConfigured()) {
    for (const v of memory.emails.values()) if (v._id === id) v.status = status;
    return;
  }
  const db = await getDb();
  await db
    .collection<EmailDoc>("emails")
    .updateOne({ _id: id as any }, { $set: { status } });
}

// ---------------- Tasks ----------------
export async function insertTasks(tasks: Omit<TaskDoc, "_id">[]): Promise<TaskDoc[]> {
  const withIds: TaskDoc[] = tasks.map((t) => ({ ...t, _id: newId() }));
  if (!isDbConfigured()) {
    for (const t of withIds) memory.tasks.set(t._id!, t);
    return withIds;
  }
  if (withIds.length === 0) return [];
  const db = await getDb();
  await db.collection<TaskDoc>("tasks").insertMany(withIds as any);
  return withIds;
}

export async function listTasksForWeek(userId: string, weekStart: string): Promise<TaskDoc[]> {
  if (!isDbConfigured()) {
    return Array.from(memory.tasks.values()).filter(
      (t) => t.userId === userId && t.weekStart === weekStart,
    );
  }
  const db = await getDb();
  const docs = await db
    .collection<TaskDoc>("tasks")
    .find({ userId, weekStart })
    .toArray();
  return docs.map(stripId);
}

export async function listAllTasks(userId: string): Promise<TaskDoc[]> {
  if (!isDbConfigured()) {
    return Array.from(memory.tasks.values()).filter((t) => t.userId === userId);
  }
  const db = await getDb();
  const docs = await db.collection<TaskDoc>("tasks").find({ userId }).toArray();
  return docs.map(stripId);
}

export async function setTaskStatus(id: string, status: "todo" | "done"): Promise<void> {
  if (!isDbConfigured()) {
    const t = memory.tasks.get(id);
    if (t) t.status = status;
    return;
  }
  const db = await getDb();
  await db
    .collection<TaskDoc>("tasks")
    .updateOne({ _id: id as any }, { $set: { status } });
}

// ---------------- helpers ----------------
function stripId<T extends { _id?: any }>(doc: T): T {
  if (doc && doc._id && typeof doc._id !== "string") {
    return { ...doc, _id: doc._id.toString() };
  }
  return doc;
}
