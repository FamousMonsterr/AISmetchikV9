// @ts-nocheck
import "./bootstrap";
import "dotenv/config";
import { MongoClient } from "mongodb";

const mainUri = process.env.MONGODB_URI;
const mainDbName = process.env.MONGODB_DB;
const logsUri = process.env.MONGODB_LOGS_URI || mainUri;
const logsDbName = process.env.MONGODB_LOGS_DB || mainDbName;

if (!mainUri || !mainDbName) {
  throw new Error("Missing MONGODB_URI or MONGODB_DB.");
}

if (!logsUri || !logsDbName) {
  throw new Error("Missing MONGODB_LOGS_URI/MONGODB_LOGS_DB or fallback main Mongo settings.");
}

async function ensureMainIndexes(client: MongoClient) {
  const db = client.db(mainDbName);
  await Promise.all([
    db.collection("requests").createIndex({ userId: 1, timestamp: -1 }),
    db.collection("requests").createIndex({ userId: 1, status: 1, timestamp: -1 }),
    db.collection("requests").createIndex({ status: 1, reportedAt: -1 }),
    db.collection("requests").createIndex({ userId: 1, parentProjectId: 1, isMainVersion: 1 }),
    db.collection("requests").createIndex({ userId: 1, isMainVersion: 1, archivedAt: 1, timestamp: -1 }),
    db.collection("companies").createIndex({ userId: 1, isDefault: -1, createdAt: -1 }),
    db.collection("priceBaseItems").createIndex({ userId: 1, section: 1, name: 1 }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ phoneNormalized: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ telegramChatId: 1, createdAt: -1 }),
    db.collection("users").createIndex({ vkId: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ referredBy: 1, createdAt: -1 }),
    db.collection("auth_link_states").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("auth_link_states").createIndex({ provider: 1, userId: 1, createdAt: -1 }),
    db.collection("vk_chats").createIndex({ peerId: 1 }, { unique: true }),
    db.collection("invoices").createIndex({ userId: 1, invoiceDate: -1 }),
    db.collection("notifications").createIndex({ publishedAt: -1 }),
    db.collection("partner_requests").createIndex({ createdAt: -1 }),
    db.collection("credit_lots").createIndex({ userId: 1, type: 1, remaining: -1 }),
    db.collection("credit_lots").createIndex({ userId: 1, expiresAt: 1 }),
    db.collection("credit_ledger").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("credit_ledger").createIndex({ lotId: 1 }),
    db.collection("pro_subscription_orders").createIndex({ status: 1, createdAt: -1 }),
    db.collection("pro_subscription_orders").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("pro_subscription_orders").createIndex({ autoApproveAt: 1 }),
    db.collection("server_analysis_jobs").createIndex({ status: 1, createdAt: 1 }),
    db.collection("server_analysis_jobs").createIndex({ status: 1, userPlan: 1, createdAt: 1 }),
    db.collection("server_analysis_jobs").createIndex({ userId: 1, projectId: 1, createdAt: -1 }),
    db.collection("server_analysis_jobs").createIndex({ idempotencyKey: 1, status: 1 }),
    db.collection("server_analysis_jobs").createIndex({ fileSha1: 1, pipelineVersion: 1 }),
    db.collection("file_analysis_cache").createIndex({ pipelineVersion: 1, createdAt: -1 }),
    db.collection("file_markdown_cache").createIndex({ updatedAt: -1 }),
    db.collection("s3_file_cache").createIndex({ createdAt: -1 }),
    db.collection("passkey_credentials").createIndex({ credentialId: 1 }, { unique: true }),
    db.collection("passkey_credentials").createIndex({ userId: 1, revokedAt: 1, createdAt: -1 }),
    db.collection("passkey_challenges").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("passkey_challenges").createIndex({ userId: 1, kind: 1, createdAt: -1 }),
    db.collection("passkey_signin_tickets").createIndex({ token: 1 }, { unique: true }),
    db.collection("passkey_signin_tickets").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

async function ensureLogIndexes(client: MongoClient) {
  const db = client.db(logsDbName);
  await Promise.all([
    db.collection("user_logs").createIndex({ timestamp: -1 }),
    db.collection("user_logs").createIndex({ userId: 1, timestamp: -1 }),
    db.collection("user_logs").createIndex({ action: 1, timestamp: -1 }),
    db.collection("ai_api_logs").createIndex({ timestamp: -1 }),
    db.collection("ai_api_logs").createIndex({ userId: 1, timestamp: -1 }),
    db.collection("ai_api_logs").createIndex({ provider: 1, timestamp: -1 }),
    db.collection("ai_api_logs").createIndex({ model: 1, timestamp: -1 }),
    db.collection("project_event_logs").createIndex({ timestamp: -1 }),
    db.collection("project_event_logs").createIndex({ projectId: 1, timestamp: -1 }),
    db.collection("project_event_logs").createIndex({ jobId: 1, timestamp: -1 }),
    db.collection("project_event_logs").createIndex({ userId: 1, timestamp: -1 }),
    db.collection("project_event_logs").createIndex({ action: 1, timestamp: -1 }),
    db.collection("project_event_logs").createIndex({ stage: 1, timestamp: -1 }),
    db.collection("project_event_logs").createIndex({ status: 1, timestamp: -1 }),
    db.collection("project_event_logs").createIndex({ source: 1, timestamp: -1 }),
    db.collection("project_event_logs").createIndex({ model: 1, timestamp: -1 }),
    db.collection("project_event_logs").createIndex({ correlationId: 1, timestamp: -1 }),
    db.collection("project_event_logs").createIndex({ tags: 1, timestamp: -1 }),
    db.collection("engagement_events").createIndex({ timestamp: -1 }),
    db.collection("engagement_events").createIndex({ userId: 1, timestamp: -1 }),
    db.collection("engagement_events").createIndex({ type: 1, timestamp: -1 }),
  ]);
}

async function run() {
  const mainClient = new MongoClient(mainUri);
  const logsClient = logsUri === mainUri ? mainClient : new MongoClient(logsUri);

  await mainClient.connect();
  if (logsClient !== mainClient) {
    await logsClient.connect();
  }

  await ensureMainIndexes(mainClient);
  await ensureLogIndexes(logsClient);

  if (logsClient !== mainClient) {
    await logsClient.close();
  }
  await mainClient.close();

  console.log(`MongoDB indexes created. main=${mainDbName}, logs=${logsDbName}`);
}

run().catch((error) => {
  console.error("Index creation failed:", error);
  process.exit(1);
});
