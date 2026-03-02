export type TelegramAudience = 'default' | 'user' | 'partner' | 'manager' | 'admin';

export type UserBotState = 'unlinked' | 'linked_free' | 'linked_paid' | 'payment_pending' | 'support_open';
export type PartnerBotState = 'unlinked' | 'partner_bronze' | 'partner_silver' | 'partner_gold' | 'partner_platinum' | 'attestation_pending';
export type ManagerBotState = 'offline' | 'online' | 'busy' | 'sla_risk' | 'oncall';
export type AdminBotState = 'normal' | 'degraded' | 'incident';

export const TELEGRAM_AUDIENCE_COMMANDS: Record<TelegramAudience, string[]> = {
  default: ['/start', '/help', '/profile', '/new', '/history', '/pay', '/ping'],
  user: ['/start', '/help', '/profile', '/new', '/history', '/pay', '/support', '/link', '/unlink', '/ping'],
  partner: ['/start', '/help', '/profile', '/ref', '/stats', '/clients', '/attestation', '/payout', '/support', '/ping'],
  manager: ['/start', '/help', '/queue', '/take', '/done', '/reassign', '/sla', '/client', '/note', '/ping'],
  admin: ['/start', '/help', '/health', '/alerts', '/deploy', '/workers', '/payments', '/tickets', '/webhooks', '/ping'],
};

export function extractCommand(text?: string | null): string | null {
  if (!text) return null;
  const token = text.trim().split(/\s+/)[0] || '';
  if (!token.startsWith('/')) return null;
  return token.toLowerCase();
}

export function isCommandAllowed(audience: TelegramAudience, command: string | null): boolean {
  if (!command) return false;
  return TELEGRAM_AUDIENCE_COMMANDS[audience].includes(command);
}

export function resolveUserBotState(audience: TelegramAudience, user: any): string {
  if (audience === 'user' || audience === 'default') {
    if (!user?.telegramChatId) return 'unlinked';
    if (user?.supportThreadOpen) return 'support_open';
    if (user?.planSource === 'pending_payment') return 'payment_pending';
    if (user?.plan && ['PRO', 'Business', 'Enterprise'].includes(user.plan)) return 'linked_paid';
    return 'linked_free';
  }

  if (audience === 'partner') {
    if (!user?.telegramChatId) return 'unlinked';
    const status = String(user?.partnerStatus || 'Bronze').toLowerCase();
    if (user?.partnerAttestationPending) return 'attestation_pending';
    if (status === 'platinum') return 'partner_platinum';
    if (status === 'gold') return 'partner_gold';
    if (status === 'silver') return 'partner_silver';
    return 'partner_bronze';
  }

  if (audience === 'manager') {
    if (user?.onCall) return 'oncall';
    if (user?.slaRiskCount > 0) return 'sla_risk';
    if (user?.activeThreadId) return 'busy';
    return user?.managerOnline ? 'online' : 'offline';
  }

  if (audience === 'admin') {
    if (user?.incidentOpen) return 'incident';
    if (user?.systemDegraded) return 'degraded';
    return 'normal';
  }

  return 'unlinked';
}

export function getUnknownCommandMessage(audience: TelegramAudience): string {
  return `Команда недоступна для аудитории "${audience}". Используйте /help для списка доступных команд.`;
}
