import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "careermaxing";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _mongoIndexesInit: boolean | undefined;
  // eslint-disable-next-line no-var
  var _mongoDisabled: boolean | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

/**
 * Returns true when the Mongo client is configured AND has not already failed
 * to connect in this process. The moment a connection attempt fails we
 * permanently flip to in-memory mode for the rest of the dev session so the
 * app stays usable even if Atlas is unreachable (IP allowlist, TLS, etc.).
 */
export function isDbConfigured(): boolean {
  if (global._mongoDisabled) return false;
  return Boolean(uri && uri.length > 0);
}

function disableDb(reason: string) {
  if (!global._mongoDisabled) {
    console.warn(
      `[mongo] disabling DB and falling back to in-memory storage: ${reason}`,
    );
    global._mongoDisabled = true;
  }
}

export async function getClient(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (global._mongoClient) return global._mongoClient;
  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    clientPromise = client.connect().catch((err) => {
      clientPromise = null;
      disableDb((err as Error).message);
      throw err;
    });
  }
  const connected = await clientPromise;
  global._mongoClient = connected;
  return connected;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  const db = client.db(dbName);
  if (!global._mongoIndexesInit) {
    await ensureIndexes(db);
    global._mongoIndexesInit = true;
  }
  return db;
}

/**
 * Like getDb(), but returns null instead of throwing if Mongo can't be reached.
 * Marks the DB as disabled on failure so future calls go straight to memory.
 * Use this in repos to seamlessly fall back to in-memory mode.
 */
export async function tryGetDb(): Promise<Db | null> {
  if (!isDbConfigured()) return null;
  try {
    return await getDb();
  } catch (err) {
    disableDb((err as Error).message);
    return null;
  }
}

async function ensureIndexes(db: Db) {
  try {
    await Promise.all([
      db
        .collection("opportunities")
        .createIndex({ userId: 1, kind: 1, dedupeKey: 1 }, { unique: true }),
      db.collection("opportunities").createIndex({ userId: 1, kind: 1, status: 1 }),
      db.collection("opportunities").createIndex({ userId: 1, sourceUrl: 1 }),
      db.collection("emails").createIndex({ userId: 1, dedupeKey: 1 }, { unique: true }),
      db.collection("tasks").createIndex({ userId: 1, weekStart: 1 }),
      db.collection("profiles").createIndex({ userId: 1 }, { unique: true }),
      db.collection("domainExpansions").createIndex({ userId: 1 }, { unique: true }),
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
    ]);
  } catch (err) {
    console.warn("[mongo] ensureIndexes warning:", (err as Error).message);
  }
}
