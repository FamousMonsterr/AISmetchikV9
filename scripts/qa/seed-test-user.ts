// @ts-nocheck
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';

async function main() {
  const email = process.env.QA_TEST_USER_EMAIL?.toLowerCase();
  const password = process.env.QA_TEST_USER_PASSWORD;
  const phone = process.env.QA_TEST_USER_PHONE || '';
  const protect = String(process.env.QA_PROTECT_USER || 'true').toLowerCase() !== 'false';

  if (!email || !password) {
    throw new Error('QA_TEST_USER_EMAIL и QA_TEST_USER_PASSWORD обязательны.');
  }

  const db = await getDb();
  const existing = await db.collection('users').findOne({ email });
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  if (existing) {
    await db.collection('users').updateOne(
      { _id: existing._id },
      {
        $set: {
          passwordHash,
          phone,
          status: 'active',
          archivedAt: null,
          isTester: true,
          qaProtected: protect,
          updatedAt: now,
        },
      }
    );
    console.log(`QA user updated: ${email}`);
    return;
  }

  await db.collection('users').insertOne({
    _id: `qa_${Date.now()}`,
    email,
    passwordHash,
    phone,
    phoneVerified: false,
    displayName: 'QA Test User',
    systemRole: 'User',
    plan: 'Free',
    status: 'active',
    archivedAt: null,
    credits: 100,
    projectCount: 0,
    maxCompanies: 2,
    maxActiveProjects: 20,
    maxDraftsPerProject: 5,
    availableModels: [],
    canShareProjects: false,
    canUsePrivatePriceBase: false,
    canGroupProjects: false,
    isTester: true,
    qaProtected: protect,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`QA user created: ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
