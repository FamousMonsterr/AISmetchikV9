// src/lib/plan-utils.ts
import type { UserPlan } from '@/contexts/AppContext';

export const PLAN_ORDER: UserPlan[] = ['Free', 'PRO', 'Business', 'Enterprise'];

export const getNextPlan = (plan: UserPlan): UserPlan | null => {
  const index = PLAN_ORDER.indexOf(plan);
  if (index === -1 || index === PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[index + 1];
};

export const getPlanLabel = (plan: UserPlan | null): string => {
  if (!plan) return '';
  if (plan === 'Business') return 'Business (от 3 пользователей)';
  if (plan === 'Enterprise') return 'Enterprise (от 25 пользователей)';
  return plan;
};
