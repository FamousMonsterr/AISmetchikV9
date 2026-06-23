// src/app/api/s3-upload/route.ts
'use server';

import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { getS3Client } from "@/actions/adminActions";
import { nanoid } from 'nanoid';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser();
    if (!auth.ok) return auth.response;

    const rateLimitResponse = enforceRateLimit({
      request,
      scope: 'api:s3-upload:presign',
      userId: auth.user.id,
      max: 30,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { fileName, fileType, presetId, bucketType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "fileName and fileType are required" }, { status: 400 });
    }
    
    const { s3Client, config } = await getS3Client(presetId, { bucketType });
    
    // Correctly encode the filename and generate a unique key
    const prefix = config.keyPrefix || '';
    const objectKey = `${prefix}${nanoid()}-${fileName}`;

    const putCommand = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      ContentType: fileType,
    });
    const uploadUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: 3600,
    });
    
        // Debug log only in development
        if (process.env.NODE_ENV === 'development') {
          console.log('S3 Upload URL generated:', { objectKey, fileType });
        }
    
    let accessUrl: string;
    let urlExpirationTimestamp: number;
    
    if (config.bucketIsPublic) {
        // Construct the public URL directly
        accessUrl = `${config.endpoint}/${config.bucketName}/${objectKey}`;
        // For public URLs, expiration is effectively infinite, but we can set a very long time
        urlExpirationTimestamp = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year
    } else {
        // Generate a presigned URL for private buckets
        const getUrlExpiration = config.presignedUrlExpiration ?? 900; // Default 15 minutes
        const getCommand = new GetObjectCommand({
            Bucket: config.bucketName,
            Key: objectKey,
        });
        accessUrl = await getSignedUrl(s3Client, getCommand, {
            expiresIn: getUrlExpiration,
        });
        urlExpirationTimestamp = Date.now() + getUrlExpiration * 1000;
    }


    return NextResponse.json({ uploadUrl, accessUrl, objectKey, urlExpirationTimestamp });

  } catch (error) {
    console.error("Error creating signed URL:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
