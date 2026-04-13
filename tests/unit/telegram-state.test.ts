import { describe, it, expect } from 'vitest';
import {
  extractCommand,
  getUnknownCommandMessage,
  isCommandAllowed,
  resolveUserBotState,
} from '@/server-functions/telegram/state';

describe('telegram state model', () => {
  it('extracts commands from message text', () => {
    expect(extractCommand('/start')).toBe('/start');
    expect(extractCommand('/PING 123')).toBe('/ping');
    expect(extractCommand('hello')).toBe(null);
  });

  it('checks command permissions per audience', () => {
    expect(isCommandAllowed('user', '/support')).toBe(true);
    expect(isCommandAllowed('manager', '/support')).toBe(false);
    expect(isCommandAllowed('admin', '/webhooks')).toBe(true);
  });

  it('resolves user bot states', () => {
    expect(resolveUserBotState('user', { telegramChatId: null })).toBe('unlinked');
    expect(resolveUserBotState('user', { telegramChatId: 1, plan: 'PRO' })).toBe('linked_paid');
    expect(resolveUserBotState('partner', { telegramChatId: 1, partnerStatus: 'Gold' })).toBe('partner_gold');
    expect(resolveUserBotState('manager', { managerOnline: true })).toBe('online');
    expect(resolveUserBotState('admin', { incidentOpen: true })).toBe('incident');
  });

  it('returns useful unknown command message', () => {
    expect(getUnknownCommandMessage('partner')).toContain('partner');
  });
});
