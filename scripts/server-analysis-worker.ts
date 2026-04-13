// scripts/server-analysis-worker.ts
// Long-lived worker loop for processing queued server analysis jobs.
import './bootstrap';
export {};

const { runServerAnalysisWorkerOnce } = require('../src/server-functions/analysis/worker');

const POLL_INTERVAL_MS = Math.max(1000, Number(process.env.SERVER_ANALYSIS_WORKER_POLL_MS || 2500));
const BATCH_SIZE = Math.max(1, Number(process.env.SERVER_ANALYSIS_WORKER_BATCH_SIZE || 5));

let stopped = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runLoop() {
  console.log(`[worker] started (batch=${BATCH_SIZE}, poll=${POLL_INTERVAL_MS}ms)`);
  while (!stopped) {
    try {
      const result = await runServerAnalysisWorkerOnce(BATCH_SIZE);
      if (result.processed) {
        console.log(`[worker] processed=${result.processed}, errors=${result.errors.length}`);
      }
      if (result.errors.length) {
        for (const error of result.errors) {
          console.error(`[worker] job ${error.jobId} failed: ${error.message}`);
        }
      }
    } catch (err: any) {
      console.error('[worker] loop error:', err?.message || err);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  console.log('[worker] stopped');
}

async function main() {
  process.on('SIGINT', () => { stopped = true; });
  process.on('SIGTERM', () => { stopped = true; });
  await runLoop();
}

main().catch((err) => {
  console.error('Worker crashed:', err);
  process.exit(1);
});
