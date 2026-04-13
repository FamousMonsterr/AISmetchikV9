// @ts-nocheck
'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unlinkVkAccountFromUser } from '@/lib/account-links';

export async function unlinkVkAccount(): Promise<{ success: boolean; message: string }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'Требуется аутентификация.' };
  }

  try {
    await unlinkVkAccountFromUser(userId);
    return { success: true, message: 'Связь с VK удалена.' };
  } catch (error: any) {
    console.error('unlinkVkAccount failed:', error);
    return { success: false, message: error?.message || 'Не удалось отвязать VK.' };
  }
}
