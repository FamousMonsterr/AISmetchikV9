import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB;

if (!mongoUri) {
  throw new Error('Missing MONGODB_URI in environment.');
}

if (!mongoDbName) {
  throw new Error('Missing MONGODB_DB in environment.');
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const clientPromise =
  global._mongoClientPromise ??
  new MongoClient(mongoUri).connect();

if (process.env.NODE_ENV !== 'production') {
  global._mongoClientPromise = clientPromise;
}

export async function getClient() {
  return clientPromise;
}

export async function getDb() {
  const client = await getClient();
  return client.db(mongoDbName);
}
