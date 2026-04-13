// scripts/auto-approve-pro-payments.ts
import './bootstrap';
import 'dotenv/config';
import { autoApproveProSubscriptionOrders } from '../src/actions/proSubscriptionActions';

async function run() {
  const result = await autoApproveProSubscriptionOrders();
  if (!result.success) {
    throw new Error('Auto-approve failed.');
  }
  console.log(`Auto-approve complete. Orders processed: ${result.processed}`);
}

run().catch((error) => {
  console.error('Auto-approve failed:', error);
  process.exit(1);
});
