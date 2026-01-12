// src/app/api/s3-upload/route.ts
'use server';

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { getEnvSettings } from "@/actions/adminActions";
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "fileName and fileType are required" }, { status: 400 });
    }
    
    const s3Config = await getEnvSettings();
    if (!s3Config.s3StorageEnabled || !s3Config.s3Endpoint || !s3Config.s3Region || !s3Config.s3AccessKeyId || !s3Config.s3SecretAccessKey || !s3Config.s3BucketName) {
        return NextResponse.json({ error: "S3 storage is not configured or enabled completely in the admin panel." }, { status: 500 });
    }

    const accessKeyId = s3Config.s3TenantId ? `${s3Config.s3TenantId}:${s3Config.s3AccessKeyId}` : s3Config.s3AccessKeyId;

    const s3Client = new S3Client({
      region: s3Config.s3Region,
      endpoint: s3Config.s3Endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: s3Config.s3SecretAccessKey,
      },
      forcePathStyle: true,
    });
    
    // Correctly encode the filename and generate a unique key
    const objectKey = `${nanoid()}-${encodeURIComponent(fileName)}`;

    const putCommand = new PutObjectCommand({
      Bucket: s3Config.s3BucketName,
      Key: objectKey,
      ContentType: fileType,
    });
    const uploadUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: 3600, // 1 hour for upload
    });
    
    let accessUrl: string;
    let urlExpirationTimestamp: number;
    
    if (s3Config.s3BucketIsPublic) {
        // Construct the public URL directly
        accessUrl = `${s3Config.s3Endpoint}/${s3Config.s3BucketName}/${objectKey}`;
        // For public URLs, expiration is effectively infinite, but we can set a very long time
        urlExpirationTimestamp = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year
    } else {
        // Generate a presigned URL for private buckets
        const getUrlExpiration = s3Config.s3PresignedUrlExpiration || 900; // Default 15 minutes
        const getCommand = new GetObjectCommand({
            Bucket: s3Config.s3BucketName,
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
