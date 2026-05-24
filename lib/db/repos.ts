import { ObjectId } from "mongodb";
import { tryGetDb } from "./mongo";
import type {
  DomainExpansion,
  EmailDoc,
  OpportunityDoc,
  OpportunityKind,
  OpportunityStatus,
  TaskDoc,
  UserProfile,
} from "@/types";

// ---------------- In-memory fallback ----------------
// Used when MONGODB_URI is missing OR when Mongo can't be reached at runtime.
// Persisted on globalThis so it survives Next.js hot reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var _reposMemory:
    | {
        profiles: Map<string, UserProfile>;
        domainExpansions: Map<string, DomainExpansion>;
        opportunities: Map<string, OpportunityDoc>;
        emails: Map<string, EmailDoc>;
        tasks: Map<string, TaskDoc>;
      }
    | undefined;
}

const memory =
  global._reposMemory ||
  (global._reposMemory = {
    profiles: new Map<string, UserProfile>(),
    domainExpansions: new Map<string, DomainExpansion>(),
    opportunities: new Map<string, OpportunityDoc>(),
    emails: new Map<string, EmailDoc>(),
    tasks: new Map<string, TaskDoc>(),
  });

function newId() {
  return new ObjectId().toString();
}

async function safeMongo<T>(op: (db: Awaited<ReturnType<typeof tryGetDb>>) => Promise<T> | null, fallback: () => T): Promise<T> {
  const db = await tryGetDb();
  if (!db) return fallback();
  try {
    const result = await op(db);
    if (result === null) return fallback();
    return result;
  } catch (err) {
    console.warn("[repos] mongo op failed, using memory:", (err as Error).message);
    return fallback();
  }
}

// ---------------- Profiles ----------------
export async function getProfile(userId: string): Promise<UserProfile | null> {
  return safeMongo(
    async (db) => {
      const doc = await db!.collection<UserProfile>("profiles").findOne({ userId });
      return (doc ? stripId(doc) : null) as UserProfile | null;
    },
    () => memory.profiles.get(userId) || null,
  );
}

export async function upsertProfile(profile: UserProfile): Promise<UserProfile> {
  const now = new Date().toISOString();
  const payload = { ...profile, updatedAt: now };
  return safeMongo(
    async (db) => {
      await db!
        .collection<UserProfile>("profiles")
        .updateOne({ userId: profile.userId }, { $set: payload }, { upsert: true });
      return payload;
    },
    () => {
      memory.profiles.set(profile.userId, payload);
      return payload;
    },
  );
}

// ---------------- Domain Expansion cache ----------------
export async function getDomainExpansion(userId: string): Promise<DomainExpansion | null> {
  return safeMongo(
    async (db) => {
      const doc = await db!
        .collection<DomainExpansion>("domainExpansions")
        .findOne({ userId });
      return (doc ? stripId(doc) : null) as DomainExpansion | null;
    },
    () => memory.domainExpansions.get(userId) || null,
  );
}

export async function saveDomainExpansion(exp: DomainExpansion): Promise<void> {
  await safeMongo(
    async (db) => {
      await db!
        .collection<DomainExpansion>("domainExpansions")
        .updateOne({ userId: exp.userId }, { $set: exp }, { upsert: true });
      return true as any;
    },
    () => {
      memory.domainExpansions.set(exp.userId, exp);
      return true as any;
    },
  );
}

// ---------------- Opportunities ----------------
export async function findOpportunityByKey(
  userId: string,
  kind: OpportunityKind,
  dedupeKey: string,
): Promise<OpportunityDoc | null> {
  return safeMongo(
    async (db) => {
      const doc = await db!
        .collection<OpportunityDoc>("opportunities")
        .findOne({ userId, kind, dedupeKey });
      return (doc ? stripId(doc) : null) as OpportunityDoc | null;
    },
    () => {
      const key = `${userId}|${kind}|${dedupeKey}`;
      return memory.opportunities.get(key) || null;
    },
  );
}

export async function findOpportunityByUrl(
  userId: string,
  sourceUrl: string,
): Promise<OpportunityDoc | null> {
  return safeMongo(
    async (db) => {
      const doc = await db!
        .collection<OpportunityDoc>("opportunities")
        .findOne({ userId, sourceUrl });
      return (doc ? stripId(doc) : null) as OpportunityDoc | null;
    },
    () => {
      for (const v of memory.opportunities.values()) {
        if (v.userId === userId && v.sourceUrl === sourceUrl) return v;
      }
      return null;
    },
  );
}

export async function insertOpportunity(
  doc: Omit<OpportunityDoc, "_id">,
): Promise<OpportunityDoc> {
  const withId: OpportunityDoc = { ...doc, _id: newId() };
  return safeMongo(
    async (db) => {
      await db!.collection<OpportunityDoc>("opportunities").insertOne(withId as any);
      return withId;
    },
    () => {
      const key = `${withId.userId}|${withId.kind}|${withId.dedupeKey}`;
      memory.opportunities.set(key, withId);
      return withId;
    },
  );
}

export async function listOpportunities(
  userId: string,
  kind: OpportunityKind,
  status?: OpportunityStatus,
): Promise<OpportunityDoc[]> {
  return safeMongo(
    async (db) => {
      const filter: any = { userId, kind };
      if (status) filter.status = status;
      const docs = await db!
        .collection<OpportunityDoc>("opportunities")
        .find(filter)
        .sort({ score: -1 })
        .toArray();
      return docs.map(stripId);
    },
    () =>
      Array.from(memory.opportunities.values())
        .filter(
          (o) => o.userId === userId && o.kind === kind && (!status || o.status === status),
        )
        .sort((a, b) => b.score - a.score),
  );
}

export async function countOpportunities(
  userId: string,
  kind: OpportunityKind,
  status?: OpportunityStatus,
): Promise<number> {
  return safeMongo(
    async (db) => {
      const filter: any = { userId, kind };
      if (status) filter.status = status;
      return db!.collection("opportunities").countDocuments(filter);
    },
    () =>
      Array.from(memory.opportunities.values()).filter(
        (o) => o.userId === userId && o.kind === kind && (!status || o.status === status),
      ).length,
  );
}

export async function getOpportunity(id: string): Promise<OpportunityDoc | null> {
  return safeMongo(
    async (db) => {
      const doc = await db!
        .collection<OpportunityDoc>("opportunities")
        .findOne({ _id: id as any });
      return (doc ? stripId(doc) : null) as OpportunityDoc | null;
    },
    () => {
      for (const v of memory.opportunities.values()) if (v._id === id) return v;
      return null;
    },
  );
}

export async function updateOpportunityStatus(
  id: string,
  status: OpportunityStatus,
): Promise<void> {
  const updatedAt = new Date().toISOString();
  await safeMongo(
    async (db) => {
      await db!
        .collection<OpportunityDoc>("opportunities")
        .updateOne({ _id: id as any }, { $set: { status, updatedAt } });
      return true as any;
    },
    () => {
      for (const v of memory.opportunities.values()) {
        if (v._id === id) {
          v.status = status;
          v.updatedAt = updatedAt;
        }
      }
      return true as any;
    },
  );
}

// ---------------- Emails ----------------
export async function findEmailByKey(
  userId: string,
  dedupeKey: string,
): Promise<EmailDoc | null> {
  return safeMongo(
    async (db) => {
      const doc = await db!.collection<EmailDoc>("emails").findOne({ userId, dedupeKey });
      return (doc ? stripId(doc) : null) as EmailDoc | null;
    },
    () => {
      const k = `${userId}|${dedupeKey}`;
      return memory.emails.get(k) || null;
    },
  );
}

export async function insertEmail(doc: Omit<EmailDoc, "_id">): Promise<EmailDoc> {
  const withId: EmailDoc = { ...doc, _id: newId() };
  return safeMongo(
    async (db) => {
      await db!.collection<EmailDoc>("emails").insertOne(withId as any);
      return withId;
    },
    () => {
      memory.emails.set(`${withId.userId}|${withId.dedupeKey}`, withId);
      return withId;
    },
  );
}

export async function listEmails(userId: string): Promise<EmailDoc[]> {
  return safeMongo(
    async (db) => {
      const docs = await db!
        .collection<EmailDoc>("emails")
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
      return docs.map(stripId);
    },
    () =>
      Array.from(memory.emails.values())
        .filter((e) => e.userId === userId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  );
}

export async function getEmail(id: string): Promise<EmailDoc | null> {
  return safeMongo(
    async (db) => {
      const doc = await db!.collection<EmailDoc>("emails").findOne({ _id: id as any });
      return (doc ? stripId(doc) : null) as EmailDoc | null;
    },
    () => {
      for (const v of memory.emails.values()) if (v._id === id) return v;
      return null;
    },
  );
}

export async function updateEmailStatus(id: string, status: OpportunityStatus): Promise<void> {
  await safeMongo(
    async (db) => {
      await db!
        .collection<EmailDoc>("emails")
        .updateOne({ _id: id as any }, { $set: { status } });
      return true as any;
    },
    () => {
      for (const v of memory.emails.values()) if (v._id === id) v.status = status;
      return true as any;
    },
  );
}

// ---------------- Tasks ----------------
export async function insertTasks(tasks: Omit<TaskDoc, "_id">[]): Promise<TaskDoc[]> {
  const withIds: TaskDoc[] = tasks.map((t) => ({ ...t, _id: newId() }));
  if (withIds.length === 0) return [];
  return safeMongo(
    async (db) => {
      await db!.collection<TaskDoc>("tasks").insertMany(withIds as any);
      return withIds;
    },
    () => {
      for (const t of withIds) memory.tasks.set(t._id!, t);
      return withIds;
    },
  );
}

export async function listTasksForWeek(userId: string, weekStart: string): Promise<TaskDoc[]> {
  return safeMongo(
    async (db) => {
      const docs = await db!
        .collection<TaskDoc>("tasks")
        .find({ userId, weekStart })
        .toArray();
      return docs.map(stripId);
    },
    () =>
      Array.from(memory.tasks.values()).filter(
        (t) => t.userId === userId && t.weekStart === weekStart,
      ),
  );
}

export async function listAllTasks(userId: string): Promise<TaskDoc[]> {
  return safeMongo(
    async (db) => {
      const docs = await db!.collection<TaskDoc>("tasks").find({ userId }).toArray();
      return docs.map(stripId);
    },
    () => Array.from(memory.tasks.values()).filter((t) => t.userId === userId),
  );
}

export async function setTaskStatus(id: string, status: "todo" | "done"): Promise<void> {
  await safeMongo(
    async (db) => {
      await db!
        .collection<TaskDoc>("tasks")
        .updateOne({ _id: id as any }, { $set: { status } });
      return true as any;
    },
    () => {
      const t = memory.tasks.get(id);
      if (t) t.status = status;
      return true as any;
    },
  );
}

// ---------------- helpers ----------------
function stripId<T extends { _id?: any }>(doc: T): T {
  if (doc && doc._id && typeof doc._id !== "string") {
    return { ...doc, _id: doc._id.toString() };
  }
  return doc;
}
