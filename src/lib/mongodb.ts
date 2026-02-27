import { MongoClient } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise = global._mongoClientPromise;

function getMongoConfig() {
  const mongoUri = process.env.MONGODB_URI;
  const mongoDbName = process.env.MONGODB_DB;

  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI in environment.');
  }

  if (!mongoDbName) {
    throw new Error('Missing MONGODB_DB in environment.');
  }

  return { mongoUri, mongoDbName };
}

function getClientPromise() {
  if (!clientPromise) {
    const { mongoUri } = getMongoConfig();
    clientPromise = new MongoClient(mongoUri).connect();
    if (process.env.NODE_ENV !== 'production') {
      global._mongoClientPromise = clientPromise;
    }
  }

  return clientPromise;
}

export async function getClient() {
  return getClientPromise();
}

export async function getDb() {
  const { mongoDbName } = getMongoConfig();
  const client = await getClient();
  return client.db(mongoDbName);
}
