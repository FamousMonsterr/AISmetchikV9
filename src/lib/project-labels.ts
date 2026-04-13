import type { HistoryRequest } from '@/contexts/AppContext';

export const getProjectDisplayName = (project?: HistoryRequest | null) => {
  if (!project) return 'Проект';
  return (
    project.fileName ||
    project.objectName ||
    project.analysisDetails?.objectName ||
    'Проект'
  );
};

export const getProjectVersionLabel = (project?: HistoryRequest | null) => {
  const version = project?.version ?? 1;
  return `v${version}`;
};
