// scripts/telegram-bot.ts
// Run with: npm run bot:local
import './bootstrap';
export {};

require('dotenv/config');
const { startManagedBot } = require('../src/server-functions/telegram/controller');

async function main() {
  try {
    process.env.NODE_NO_WARNINGS = '1';
    await startManagedBot();
    console.log('Telegram bot started (polling)...');
  } catch (err: any) {
    console.error('Failed to start Telegram bot:', err?.message || err);
    process.exit(1);
  }
}

main();
