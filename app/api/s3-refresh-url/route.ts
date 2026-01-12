// src/app/api/s3-refresh-url/route.ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { getEnvSettings } from "@/actions/adminActions";

export async function POST(request: NextRequest) {
  try {
    const { objectKey } = await request.json();

    if (!objectKey) {
      return NextResponse.json({ error: "objectKey is required" }, { status: 400 });
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
    
    const expiration = s3Config.s3PresignedUrlExpiration || 900;

    const getCommand = new GetObjectCommand({
        Bucket: s3Config.s3BucketName,
        Key: objectKey,
    });
    
    const newAccessUrl = await getSignedUrl(s3Client, getCommand, {
        expiresIn: expiration,
    });

    // Calculate the new expiration timestamp in milliseconds
    const newExpirationTimestamp = Date.now() + expiration * 1000;

    return NextResponse.json({ newAccessUrl, newExpirationTimestamp });

  } catch (error) {
    console.error("Error refreshing signed URL:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
