import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "careermaxing";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _mongoIndexesInit: boolean | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(uri && uri.length > 0);
}

export async function getClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (global._mongoClient) {
    return global._mongoClient;
  }
  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    clientPromise = client.connect();
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
