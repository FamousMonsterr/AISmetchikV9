// scripts/migrate-credits-ledger.ts
import 'dotenv/config';
import { nanoid } from 'nanoid';
import { getDb } from '../src/lib/mongodb';

const BONUS_DAYS = 30;
const PURCHASED_DAYS = 365;

const addDays = (base: Date, days: number) => new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

async function run() {
  const db = await getDb();
  const users = await db.collection('users').find({}).toArray();
  let migrated = 0;

  for (const user of users) {
    const userId = user._id;
    const existingLots = await db.collection('credit_lots').countDocuments({ userId });
    if (existingLots > 0) continue;

    const totalCredits = user.credits || 0;
    const bonusCredits = (user.bonusCredits || 0) + (user.promoCredits || 0);
    const purchasedCredits = Math.max(totalCredits - bonusCredits, 0);

    if (bonusCredits <= 0 && purchasedCredits <= 0) continue;

    const now = new Date();
    const bonusExpiresAt = user.bonusCreditsExpireAt || user.promoCreditsExpireAt || addDays(now, BONUS_DAYS);
    const purchasedExpiresAt = user.purchasedCreditsExpireAt || addDays(now, PURCHASED_DAYS);

    const lots: any[] = [];
    const ledger: any[] = [];

    if (bonusCredits > 0) {
      const lotId = nanoid();
      lots.push({
        _id: lotId,
        userId,
        type: 'bonus',
        amount: bonusCredits,
        remaining: bonusCredits,
        expiresAt: bonusExpiresAt,
        source: 'migration',
        createdAt: now,
        metadata: { legacy: true },
      });
      ledger.push({
        _id: nanoid(),
        userId,
        type: 'grant',
        amount: bonusCredits,
        lotId,
        reason: 'migration',
        createdAt: now,
        metadata: { lotType: 'bonus', legacy: true },
      });
    }

    if (purchasedCredits > 0) {
      const lotId = nanoid();
      lots.push({
        _id: lotId,
        userId,
        type: 'purchased',
        amount: purchasedCredits,
        remaining: purchasedCredits,
        expiresAt: purchasedExpiresAt,
        source: 'migration',
        createdAt: now,
        metadata: { legacy: true },
      });
      ledger.push({
        _id: nanoid(),
        userId,
        type: 'grant',
        amount: purchasedCredits,
        lotId,
        reason: 'migration',
        createdAt: now,
        metadata: { lotType: 'purchased', legacy: true },
      });
    }

    if (lots.length) {
      await db.collection('credit_lots').insertMany(lots);
    }
    if (ledger.length) {
      await db.collection('credit_ledger').insertMany(ledger);
    }

    await db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          bonusCredits,
          purchasedCredits,
          credits: bonusCredits + purchasedCredits,
          bonusCreditsExpireAt: bonusCredits > 0 ? bonusExpiresAt : null,
          purchasedCreditsExpireAt: purchasedCredits > 0 ? purchasedExpiresAt : null,
          creditsUpdatedAt: now,
        },
      },
    );

    migrated += 1;
  }

  console.log(`Migration complete. Users migrated: ${migrated}`);
}

run().catch((error) => {
  console.error('Credit migration failed:', error);
  process.exit(1);
});
