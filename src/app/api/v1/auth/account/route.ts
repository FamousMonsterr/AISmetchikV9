import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/mongodb';
import { requireV1BearerUser } from '@/lib/api-v1-auth';

export async function DELETE(request: NextRequest) {
  const auth = await requireV1BearerUser(request);
  if (!auth.ok) return auth.response;

  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: auth.user.id } as any);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    if (user.qaProtected) {
      return NextResponse.json({ error: 'Protected QA account cannot be deleted.' }, { status: 403 });
    }

    const now = new Date();
    const anonymizedEmail = `deleted_${String(user._id)}_${now.getTime()}@deleted.local`;

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          email: anonymizedEmail,
          displayName: 'Deleted User',
          phone: '',
          phoneNormalized: '',
          phoneVerified: false,
          telegramUsername: '',
          telegramChatId: null,
          telegramLinkedAt: null,
          vkId: null,
          vkUsername: '',
          vkLinkedAt: null,
          vkPhotoUrl: null,
          vkPeerId: null,
          status: 'blocked',
          archivedAt: now,
          deletedAt: now,
          deletedBySelf: true,
          updatedAt: now,
          passwordHash: await bcrypt.hash(nanoid(), 10),
        },
      }
    );

    return NextResponse.json({ success: true, message: 'Account deleted.' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete account.' }, { status: 500 });
  }
}
