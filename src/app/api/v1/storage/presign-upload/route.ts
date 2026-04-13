import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import { getS3Client } from '@/actions/adminActions';
import { requireV1BearerUser } from '@/lib/api-v1-auth';

export async function POST(request: NextRequest) {
  const auth = await requireV1BearerUser(request);
  if (!auth.ok) return auth.response;

  const { fileName, fileType, presetId, bucketType } = await request.json().catch(() => ({}));
  if (!fileName || !fileType) {
    return NextResponse.json({ error: 'fileName and fileType are required' }, { status: 400 });
  }

  const { s3Client, config } = await getS3Client(presetId, { bucketType });
  const objectKey = `${nanoid()}-${encodeURIComponent(fileName)}`;

  const putCommand = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    ContentType: fileType,
  });
  const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 });

  let accessUrl: string;
  let urlExpirationTimestamp: number;
  if (config.bucketIsPublic) {
    accessUrl = `${config.endpoint}/${config.bucketName}/${objectKey}`;
    urlExpirationTimestamp = Date.now() + (365 * 24 * 60 * 60 * 1000);
  } else {
    const expiresIn = config.presignedUrlExpiration ?? 900;
    const getCommand = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
    });
    accessUrl = await getSignedUrl(s3Client, getCommand, { expiresIn });
    urlExpirationTimestamp = Date.now() + expiresIn * 1000;
  }

  return NextResponse.json({ uploadUrl, accessUrl, objectKey, urlExpirationTimestamp });
}
