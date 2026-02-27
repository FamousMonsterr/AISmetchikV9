import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '@/actions/adminActions';
import { requireV1BearerUser } from '@/lib/api-v1-auth';

export async function POST(request: NextRequest) {
  const auth = await requireV1BearerUser(request);
  if (!auth.ok) return auth.response;

  const { objectKey, presetId, bucketType } = await request.json().catch(() => ({}));
  if (!objectKey) {
    return NextResponse.json({ error: 'objectKey is required' }, { status: 400 });
  }

  const { s3Client, config } = await getS3Client(presetId, { bucketType });
  const expiration = config.presignedUrlExpiration ?? 900;
  const getCommand = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
  });
  const newAccessUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: expiration });
  const newExpirationTimestamp = Date.now() + expiration * 1000;

  return NextResponse.json({ newAccessUrl, newExpirationTimestamp });
}
