// src/app/api/test-ai/upload/route.ts
// Серверная загрузка файла в S3 (обходит CORS)

import { NextRequest, NextResponse } from 'next/server';
import { getS3Client } from '@/actions/adminActions';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Нет файла' }, { status: 400 });
    }

    // Используем getS3Client — он корректно формирует ключи для Cloud.ru (tenantId:accessKeyId)
    const { s3Client, config } = await getS3Client(undefined, { bucketType: 'analysis' });

    if (!config.bucketName) {
      return NextResponse.json({ error: 'Не настроен bucket для analysis. Настройте в S3 хранилище.' }, { status: 400 });
    }

    const bucket = config.bucketName;
    // Чистое ASCII имя для S3 object key
    const safeName = file.name
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // убираем диакритики
      .replace(/[^a-zA-Z0-9._-]/g, '_') // только ASCII
      .replace(/_+/g, '_') // схлопываем подчёркивания
      .substring(0, 100); // ограничиваем длину
    const prefix = config.keyPrefix || '';
    const objectKey = `${prefix}${nanoid(8)}-${safeName}`;
    const arrayBuffer = await file.arrayBuffer();
    const body = Buffer.from(arrayBuffer);

    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: file.type || 'application/octet-stream',
    }));

    // Строим публичный URL (bucket с публичным доступом)
    const endpointBase = config.endpoint?.replace(/\/$/, '') || 'https://s3.cloud.ru';
    const publicUrl = `${endpointBase}/${bucket}/${encodeURIComponent(objectKey)}`;

    // Пробуем plain URL, если не публичный — fallback на presigned
    let accessUrl = publicUrl;
    let urlType = 'public';

    try {
      const headRes = await fetch(publicUrl, { method: 'HEAD' });
      if (!headRes.ok) {
        // Fallback: presigned URL
        const getCommand = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
        const urlExpiration = config.presignedUrlExpiration ?? 3600;
        accessUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: urlExpiration });
        urlType = 'presigned';
        if (process.env.NODE_ENV === 'development') {
          console.log(`[test-ai/upload] Public URL unavailable (${headRes.status}), using presigned`);
        }
      }
    } catch {
      // Если HEAD не прошёл, пробуем presigned
      const getCommand = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
      const urlExpiration = config.presignedUrlExpiration ?? 3600;
      accessUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: urlExpiration });
      urlType = 'presigned';
    }

    if (process.env.NODE_ENV === 'development') {
      if (process.env.NODE_ENV === 'development') {
      console.log(`[test-ai/upload] Uploaded ${file.name} (${body.length} bytes) → ${urlType}`);
    }
    }

    return NextResponse.json({
      ok: true,
      objectKey,
      bucket,
      accessUrl,
      size: body.length,
      urlType,
      originalFilename: file.name,
      safeFilename: safeName,
    });
  } catch (error: any) {
    console.error('[test-ai/upload] Error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
