import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const API_METRICS_LOG_ENABLED = process.env.API_METRICS_LOG_ENABLED !== 'false';
const API_METRICS_LOG_FILE = process.env.API_METRICS_LOG_FILE || '.logs/api-analysis-metrics.jsonl';
const metricsLogPath = resolve(process.cwd(), API_METRICS_LOG_FILE);

let metricsDirReadyPromise: Promise<void> | null = null;
let metricsWriteChain = Promise.resolve();

export function queueApiMetricLog(entry: Record<string, any>) {
  if (!API_METRICS_LOG_ENABLED) return;
  if (!metricsDirReadyPromise) {
    metricsDirReadyPromise = mkdir(dirname(metricsLogPath), { recursive: true })
      .then(() => undefined)
      .catch((err) => {
        console.error('[api][metrics] cannot create log directory', err?.message || err);
      });
  }
  const line = `${JSON.stringify(entry)}\n`;
  metricsWriteChain = metricsWriteChain
    .then(async () => {
      if (metricsDirReadyPromise) await metricsDirReadyPromise;
      await appendFile(metricsLogPath, line, 'utf8');
    })
    .catch((err) => {
      console.error('[api][metrics] cannot append log line', err?.message || err);
    });
}
