import type { DocumentTemplate, DocumentTemplateSettings, DocTemplateKind, UserPlanKey } from '@/actions/documentTemplateActions';

const planKey = (plan?: string | null): UserPlanKey => {
  if (plan === 'PRO') return 'PRO';
  if (plan === 'Business') return 'Business';
  if (plan === 'Enterprise') return 'Enterprise';
  return 'Free';
};

export const resolveDefaultTemplateId = (
  settings: DocumentTemplateSettings | null | undefined,
  plan: string | null | undefined,
  docType: DocTemplateKind,
  fallbackId: string,
) => {
  const key = planKey(plan);
  const id = settings?.defaults?.[key]?.[docType];
  return id || fallbackId;
};

export const filterTemplatesForPlan = (
  templates: DocumentTemplate[],
  settings: DocumentTemplateSettings | null | undefined,
  plan: string | null | undefined,
  docType: DocTemplateKind,
) => {
  const key = planKey(plan);
  const filteredByType = templates.filter((tpl) => tpl.docType === docType);
  if (key === 'Free') {
    return filteredByType;
  }

  const allowedIds = settings?.availability?.[key]?.[docType] || [];
  if (!allowedIds.length) return filteredByType;
  const allowedSet = new Set(allowedIds);
  return filteredByType.filter((tpl) => allowedSet.has(tpl.id));
};
