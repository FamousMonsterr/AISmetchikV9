import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteCurrentUserPasskey } from '@/lib/passkeys/service';

export const runtime = 'nodejs';

export async function DELETE(request: Request, context: { params: Promise<{ credentialId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { credentialId } = await context.params;
  try {
    const result = await deleteCurrentUserPasskey(session.user.id, credentialId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to delete passkey credential.' }, { status: 400 });
  }
}
