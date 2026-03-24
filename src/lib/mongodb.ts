import { MongoClient } from 'mongodb';

export const LOG_COLLECTIONS = new Set([
  'user_logs',
  'ai_api_logs',
  'project_event_logs',
  'engagement_events',
]);

type MongoTarget = 'main' | 'logs';

declare global {
  var _mongoClientPromises: Record<string, Promise<MongoClient>> | undefined;
}

const clientPromises = global._mongoClientPromises ?? {};

if (process.env.NODE_ENV !== 'production') {
  global._mongoClientPromises = clientPromises;
}

function getMongoConfig(target: MongoTarget = 'main') {
  const mainUri = process.env.MONGODB_URI;
  const mainDbName = process.env.MONGODB_DB;
  const logsUri = process.env.MONGODB_LOGS_URI || mainUri;
  const logsDbName = process.env.MONGODB_LOGS_DB || mainDbName;

  if (target === 'main') {
    if (!mainUri) {
      throw new Error('Missing MONGODB_URI in environment.');
    }
    if (!mainDbName) {
      throw new Error('Missing MONGODB_DB in environment.');
    }
    return { mongoUri: mainUri, mongoDbName: mainDbName };
  }

  if (!logsUri) {
    throw new Error('Missing MONGODB_LOGS_URI (or fallback MONGODB_URI) in environment.');
  }
  if (!logsDbName) {
    throw new Error('Missing MONGODB_LOGS_DB (or fallback MONGODB_DB) in environment.');
  }

  return { mongoUri: logsUri, mongoDbName: logsDbName };
}

function getClientPromise(target: MongoTarget = 'main') {
  const { mongoUri } = getMongoConfig(target);
  if (!clientPromises[mongoUri]) {
    clientPromises[mongoUri] = new MongoClient(mongoUri).connect();
  }
  return clientPromises[mongoUri];
}

export function isLogCollection(collectionName: string) {
  return LOG_COLLECTIONS.has(collectionName);
}

export async function getClient(target: MongoTarget = 'main') {
  return getClientPromise(target);
}

export async function getDb(target: MongoTarget = 'main') {
  const { mongoDbName } = getMongoConfig(target);
  const client = await getClient(target);
  return client.db(mongoDbName);
}

export async function getDbForCollection(collectionName: string) {
  return getDb(isLogCollection(collectionName) ? 'logs' : 'main');
}

export async function getLogsDb() {
  return getDb('logs');
}
