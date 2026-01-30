// scripts/server-analysis-worker.ts
// Simple worker to be run via cron/pm2 for processing queued server analysis jobs.

const { runServerAnalysisWorkerOnce } = require('../src/server-functions/analysis/worker');

async function main() {
  const result = await runServerAnalysisWorkerOnce(5);
  if (!result.processed) {
    console.log('No queued jobs found.');
    return;
  }

  console.log(`Processed ${result.processed} queued job(s).`);
  if (result.errors.length) {
    console.error(`Errors: ${result.errors.length}`);
    for (const error of result.errors) {
      console.error(`Job ${error.jobId} failed: ${error.message}`);
    }
  }
}

main().catch((err) => {
  console.error('Worker crashed:', err);
  process.exit(1);
});
