// scripts/grant-pro-monthly-credits.ts
import 'dotenv/config';
import { grantMonthlyMarketingBonuses } from '../src/actions/marketingActions';

async function run() {
  const result = await grantMonthlyMarketingBonuses({ limit: 500 });
  if (!result.success) {
    throw new Error(result.message || 'Marketing bonus job failed.');
  }
  console.log(`Marketing monthly credits granted: ${result.processed}`);
}

run().catch((error) => {
  console.error('Monthly marketing credits failed:', error);
  process.exit(1);
});
