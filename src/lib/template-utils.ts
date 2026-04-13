export type UserPlan = 'Free' | 'PRO' | 'Business' | 'Enterprise';

export type TemplateHeaderStyle = 'standard' | 'compact' | 'modern';

export type TemplateStyleConfig = {
  accentColor?: string;
  headerStyle?: TemplateHeaderStyle;
  showSignature?: boolean;
  showStamp?: boolean;
};

export type UserTemplate = TemplateStyleConfig & {
  id: string;
  userId: string;
  name: string;
  docType: 'proposal' | 'invoice' | 'contract';
  description?: string;
  createdAt?: any;
  updatedAt?: any;
  sourceTemplateId?: string;
};

export const CUSTOM_TEMPLATE_PREFIX = 'user_tpl_';

export const isCustomTemplateId = (id?: string | null) =>
  typeof id === 'string' && id.startsWith(CUSTOM_TEMPLATE_PREFIX);

export const getTemplateLimitForPlan = (plan?: UserPlan | null) => {
  switch (plan) {
    case 'PRO':
      return 1;
    case 'Business':
      return 10;
    case 'Enterprise':
      return 50;
    default:
      return 0;
  }
};

export const isTemplateConstructorAvailable = (plan?: UserPlan | null) => getTemplateLimitForPlan(plan) > 0;

export const normalizeHexColor = (value?: string | null) => {
  if (!value) return '#0f172a';
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return '#0f172a';
};
