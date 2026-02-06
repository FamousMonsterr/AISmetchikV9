// scripts/expire-credits.ts
import 'dotenv/config';
import { getDb } from '../src/lib/mongodb';
import { expireCreditsForUser } from '../src/services/credits';

async function run() {
  const db = await getDb();
  const users = await db.collection('users').find({}, { projection: { _id: 1 } }).toArray();
  let totalExpired = 0;
  for (const user of users) {
    const result = await expireCreditsForUser(user._id);
    totalExpired += result.expired || 0;
  }
  console.log(`Expired credits processed. Total expired: ${totalExpired}`);
}

run().catch((error) => {
  console.error('Expire credits failed:', error);
  process.exit(1);
});
