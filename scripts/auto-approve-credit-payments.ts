// scripts/auto-approve-credit-payments.ts
import './bootstrap';
import 'dotenv/config';
import { autoApproveCreditPurchaseOrders } from '../src/actions/creditPurchaseActions';

async function run() {
  const result = await autoApproveCreditPurchaseOrders();
  if (!result.success) {
    throw new Error('Auto-approve for credit payments failed.');
  }
  console.log(`Auto-approved credit payments: ${result.processed}`);
}

run().catch((error) => {
  console.error('Auto-approve credit payments failed:', error);
  process.exit(1);
});
