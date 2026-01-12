import 'dotenv/config';
import { MongoClient } from 'mongodb';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!mongoUri || !mongoDbName) {
  throw new Error('Missing MONGODB_URI or MONGODB_DB.');
}

if (!serviceAccountPath) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_PATH.');
}

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(serviceAccountPath), 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const firestore = admin.firestore();

const collections =
  process.env.FIREBASE_COLLECTIONS?.split(',').map((name) => name.trim()).filter(Boolean) || [
    'users',
    'requests',
    'companies',
    'priceBaseItems',
    'invoices',
    'notifications',
    'user_logs',
    'ai_api_logs',
    'partner_requests',
    'configs',
    'prompts',
    'surveys',
    'survey_responses',
    'knowledge_base_articles',
    'file_analysis_cache',
    's3_file_cache',
    'bug_reports',
  ];

function convertValue(value: any): any {
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate();
  }
  if (value instanceof admin.firestore.DocumentReference) {
    return value.path;
  }
  if (Array.isArray(value)) {
    return value.map(convertValue);
  }
  if (value && typeof value === 'object') {
    const output: Record<string, any> = {};
    Object.entries(value).forEach(([key, nested]) => {
      output[key] = convertValue(nested);
    });
    return output;
  }
  return value;
}

async function migrateCollection(client: MongoClient, collectionName: string) {
  const snapshot = await firestore.collection(collectionName).get();
  if (snapshot.empty) {
    return;
  }

  const db = client.db(mongoDbName);
  const bulkOps = snapshot.docs.map((doc) => {
    const data = convertValue(doc.data());
    return {
      replaceOne: {
        filter: { _id: doc.id },
        replacement: { _id: doc.id, ...data },
        upsert: true,
      },
    };
  });

  if (bulkOps.length) {
    await db.collection(collectionName).bulkWrite(bulkOps, { ordered: false });
  }
}

async function run() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  try {
    for (const collectionName of collections) {
      console.log(`Migrating ${collectionName}...`);
      await migrateCollection(client, collectionName);
      console.log(`Done: ${collectionName}`);
    }
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
