import { promises as fs, readFileSync } from 'fs';
import path from 'path';

export type AiRuntimeConfig = {
  providers: Record<string, { name: string; baseUrl: string; pdfProcessingPriority?: string[] }>;
  apiModels: any[];
  planModels?: Record<string, any>;
};

const aiConfigFilePath = path.join(process.cwd(), 'src', 'lib', 'ai-config.json');

export async function readAiConfig(): Promise<AiRuntimeConfig> {
  const fileContent = await fs.readFile(aiConfigFilePath, 'utf-8');
  return JSON.parse(fileContent) as AiRuntimeConfig;
}

export function readAiConfigSync(): AiRuntimeConfig {
  const fileContent = readFileSync(aiConfigFilePath, 'utf-8');
  return JSON.parse(fileContent) as AiRuntimeConfig;
}
