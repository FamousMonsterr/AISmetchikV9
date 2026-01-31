// src/app/api/s3-refresh-url/route.ts
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { getS3Client } from "@/actions/adminActions";

export async function POST(request: NextRequest) {
  try {
    const { objectKey, presetId, bucketType } = await request.json();

    if (!objectKey) {
      return NextResponse.json({ error: "objectKey is required" }, { status: 400 });
    }
    
    const { s3Client, config } = await getS3Client(presetId, { bucketType });
    
    const expiration = config.presignedUrlExpiration ?? 900;

    const getCommand = new GetObjectCommand({
        Bucket: config.bucketName,
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
