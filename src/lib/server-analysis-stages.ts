// src/lib/server-analysis-stages.ts
export type ServerStageKey =
  | 'created'
  | 'hashing'
  | 's3_cache'
  | 's3_upload'
  | 'analysis_cache'
  | 'dispatch'
  | 'queued'
  | 'running'
  | 'analysis'
  | 'saving'
  | 'complete'
  | 'failed'
  | 'cancelled';

export const SERVER_STAGE_ORDER: ServerStageKey[] = [
  'created',
  'hashing',
  's3_cache',
  's3_upload',
  'analysis_cache',
  'dispatch',
  'queued',
  'running',
  'analysis',
  'saving',
  'complete',
];

export const SERVER_STAGE_LABELS: Record<ServerStageKey, string> = {
  created: 'Создание проекта',
  hashing: 'Хеширование файла',
  s3_cache: 'Проверка S3 кеша',
  s3_upload: 'Загрузка в S3',
  analysis_cache: 'Проверка кеша анализа',
  dispatch: 'Отправка в очередь',
  queued: 'В очереди',
  running: 'Запуск анализа',
  analysis: 'Анализ AI',
  saving: 'Сохранение проекта',
  complete: 'Готово',
  failed: 'Ошибка',
  cancelled: 'Отменено',
};
