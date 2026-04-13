import { getDb } from '@/lib/mongodb';
import type { VkResolvedIdentity } from '@/lib/vk-auth';

export async function linkVkAccountToUser(userId: string, identity: VkResolvedIdentity) {
  const db = await getDb();
  const users = db.collection<any>('users');
  const currentUser = await users.findOne({ _id: userId });
  if (!currentUser) {
    throw new Error('Пользователь не найден.');
  }
  const existingLinkedUser = await users.findOne({
    vkId: identity.vkId,
    _id: { $ne: userId },
  } as any);
  if (existingLinkedUser) {
    throw new Error('Этот VK аккаунт уже привязан к другому пользователю.');
  }

  await users.updateOne(
    { _id: userId },
    {
      $set: {
        ...(currentUser.email ? {} : { email: identity.email }),
        vkId: identity.vkId,
        vkUsername: identity.vkUsername || '',
        vkPhotoUrl: identity.vkPhotoUrl || null,
        vkLinkedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );
}

export async function unlinkVkAccountFromUser(userId: string) {
  const db = await getDb();
  await db.collection<any>('users').updateOne(
    { _id: userId },
    {
      $set: {
        vkId: null,
        vkUsername: '',
        vkPhotoUrl: null,
        vkPeerId: null,
        vkLinkedAt: null,
        updatedAt: new Date(),
      },
    },
  );
}
