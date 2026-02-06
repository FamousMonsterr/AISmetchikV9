// src/lib/plan-models.ts
import aiConfig from '@/lib/ai-config.json';

type PlanKey = 'free' | 'pro' | 'business' | 'enterprise';

type PlanModelConfig = {
  defaultModel?: string;
  abTestModels?: string[];
  availableModels?: string[];
};

export type UserPlanName = 'Free' | 'PRO' | 'Business' | 'Enterprise';

const modelMap = new Map(aiConfig.apiModels.map((model: any) => [model.value, model]));

const sanitizeList = (models?: string[]) => {
  if (!Array.isArray(models)) return [];
  const unique = new Set<string>();
  models.forEach((modelId) => {
    if (modelId && modelMap.has(modelId)) {
      unique.add(modelId);
    }
  });
  return Array.from(unique);
};

const normalizePlanKey = (plan: UserPlanName): PlanKey => {
  switch (plan) {
    case 'PRO':
      return 'pro';
    case 'Business':
      return 'business';
    case 'Enterprise':
      return 'enterprise';
    case 'Free':
    default:
      return 'free';
  }
};

const getFallbackModelId = () => {
  return (
    aiConfig.apiModels.find((model: any) => model.isDefault)?.value ||
    aiConfig.apiModels[0]?.value ||
    ''
  );
};

export const getPlanModelConfig = (plan: UserPlanName): PlanModelConfig => {
  const planKey = normalizePlanKey(plan);
  const rawConfig = (aiConfig as any).planModels?.[planKey] || {};
  const defaultModel = modelMap.has(rawConfig.defaultModel) ? rawConfig.defaultModel : '';
  return {
    defaultModel,
    abTestModels: sanitizeList(rawConfig.abTestModels),
    availableModels: sanitizeList(rawConfig.availableModels),
  };
};

export const getPlanModelIds = (plan: UserPlanName): string[] => {
  const config = getPlanModelConfig(plan);
  const isBusiness = plan === 'Business' || plan === 'Enterprise';
  let candidates: string[] = [];

  if (isBusiness) {
    candidates = config.availableModels.length
      ? config.availableModels
      : config.defaultModel
        ? [config.defaultModel]
        : [];
  } else {
    candidates = config.abTestModels.length
      ? config.abTestModels
      : config.defaultModel
        ? [config.defaultModel]
        : [];
  }

  if (!candidates.length) {
    const fallback = getFallbackModelId();
    return fallback ? [fallback] : [];
  }

  return candidates;
};

export const getPlanDefaultModelId = (plan: UserPlanName): string => {
  const config = getPlanModelConfig(plan);
  const fallback = getFallbackModelId();
  return (
    config.defaultModel ||
    config.abTestModels[0] ||
    config.availableModels[0] ||
    fallback
  );
};

export const resolvePlanModelId = (plan: UserPlanName, preference?: string | null): string => {
  const candidates = getPlanModelIds(plan);
  if (preference && candidates.includes(preference)) {
    return preference;
  }
  const config = getPlanModelConfig(plan);
  if (config.defaultModel && candidates.includes(config.defaultModel)) {
    return config.defaultModel;
  }
  return candidates[0] || getFallbackModelId();
};

export const getPlanAbTestModels = (plan: UserPlanName): string[] => {
  if (plan !== 'Free' && plan !== 'PRO') return [];
  const config = getPlanModelConfig(plan);
  return config.abTestModels.length > 1 ? config.abTestModels : [];
};

export const getPlanModelOptions = (plan: UserPlanName) => {
  return getPlanModelIds(plan)
    .map((id) => modelMap.get(id))
    .filter(Boolean);
};

export const getModelLabel = (modelId: string) => {
  return modelMap.get(modelId)?.label || modelId;
};
