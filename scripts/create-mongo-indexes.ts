// @ts-nocheck

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB;

if (!mongoUri || !mongoDbName) {
  throw new Error('Missing MONGODB_URI or MONGODB_DB.');
}

async function run() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(mongoDbName);

  await Promise.all([
    db.collection('requests').createIndex({ userId: 1, timestamp: -1 }),
    db.collection('requests').createIndex({ userId: 1, status: 1, timestamp: -1 }),
    db.collection('requests').createIndex({ status: 1, reportedAt: -1 }),
    db.collection('requests').createIndex({ userId: 1, parentProjectId: 1, isMainVersion: 1 }),
    db.collection('requests').createIndex({ userId: 1, isMainVersion: 1, archivedAt: 1, timestamp: -1 }),
    db.collection('companies').createIndex({ userId: 1, isDefault: -1, createdAt: -1 }),
    db.collection('priceBaseItems').createIndex({ userId: 1, section: 1, name: 1 }),
    db.collection('users').createIndex({ telegramChatId: 1, createdAt: -1 }),
    db.collection('users').createIndex({ referredBy: 1, createdAt: -1 }),
    db.collection('invoices').createIndex({ userId: 1, invoiceDate: -1 }),
    db.collection('notifications').createIndex({ publishedAt: -1 }),
    db.collection('user_logs').createIndex({ timestamp: -1 }),
    db.collection('ai_api_logs').createIndex({ timestamp: -1 }),
    db.collection('partner_requests').createIndex({ createdAt: -1 }),
    db.collection('project_event_logs').createIndex({ timestamp: -1 }),
    db.collection('project_event_logs').createIndex({ projectId: 1, timestamp: -1 }),
    db.collection('project_event_logs').createIndex({ jobId: 1, timestamp: -1 }),
    db.collection('project_event_logs').createIndex({ userId: 1, timestamp: -1 }),
    db.collection('project_event_logs').createIndex({ action: 1, timestamp: -1 }),
    db.collection('project_event_logs').createIndex({ stage: 1, timestamp: -1 }),
    db.collection('project_event_logs').createIndex({ status: 1, timestamp: -1 }),
    db.collection('project_event_logs').createIndex({ source: 1, timestamp: -1 }),
    db.collection('project_event_logs').createIndex({ model: 1, timestamp: -1 }),
    db.collection('project_event_logs').createIndex({ tags: 1, timestamp: -1 }),
  ]);

  await client.close();
  console.log('MongoDB indexes created.');
}

run().catch((error) => {
  console.error('Index creation failed:', error);
  process.exit(1);
});
