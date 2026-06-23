import { promises as fs, readFileSync } from 'fs';
import path from 'path';

export type AiRuntimeConfig = {
  providers: Record<string, { name: string; baseUrl: string; pdfProcessingPriority?: string[] }>;
  apiModels: any[];
  /** Модель для OCR-этапа (извлечение текста из PDF) */
  ocrModel?: string;
  /** Провайдер для OCR-этапа */
  ocrProvider?: string;
  /** Модель для этапа анализа (финальный ответ) */
  analysisModel?: string;
  /** Провайдер для этапа анализа */
  analysisProvider?: string;
  /** Модель для этапа vision (анализ изображений) */
  visionModel?: string;
  /** Провайдер для этапа vision */
  visionProvider?: string;
  planModels?: Record<string, any>;
};

const aiConfigFilePath = path.join(process.cwd(), 'src', 'lib', 'ai-config.json');

let _aiConfigCache: { data: AiRuntimeConfig; expiresAt: number } | null = null;
const AI_CONFIG_TTL_MS = 30_000; // 30 seconds

export async function readAiConfig(): Promise<AiRuntimeConfig> {
  if (_aiConfigCache && Date.now() < _aiConfigCache.expiresAt) {
    return _aiConfigCache.data;
  }
  const fileContent = await fs.readFile(aiConfigFilePath, 'utf-8');
  const data = JSON.parse(fileContent) as AiRuntimeConfig;
  _aiConfigCache = { data, expiresAt: Date.now() + AI_CONFIG_TTL_MS };
  return data;
}

export function readAiConfigSync(): AiRuntimeConfig {
  const fileContent = readFileSync(aiConfigFilePath, 'utf-8');
  return JSON.parse(fileContent) as AiRuntimeConfig;
}
