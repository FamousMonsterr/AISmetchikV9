const { S3Client, CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { MongoClient } = require("mongodb");

async function main() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();
  const db = client.db("aismetchik");
  const settings = await db.collection("configs").findOne({ _id: "envSettings" });
  const preset = settings?.s3Presets?.find(p => p.id === "s3-ExLgT9");
  const cfg = preset.config;

  console.log("=== Yandex S3 Config ===");
  console.log("Endpoint:", cfg.s3Endpoint);
  console.log("Region:", cfg.s3Region);
  console.log("AccessKey:", cfg.s3AccessKeyId?.substring(0, 15) + "...");

  const s3 = new S3Client({
    endpoint: cfg.s3Endpoint,
    region: cfg.s3Region,
    credentials: { accessKeyId: cfg.s3AccessKeyId, secretAccessKey: cfg.s3SecretAccessKey },
    forcePathStyle: true,
  });

  // 1. Create missing buckets
  const bucketsToCreate = ["aismetchik", "user-docs-bucket", "project-docs-bucket"];
  for (const name of bucketsToCreate) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: name }));
      console.log(name + ": already exists");
    } catch (e) {
      try {
        await s3.send(new CreateBucketCommand({ Bucket: name }));
        console.log(name + ": CREATED");
      } catch (ce) {
        console.error(name + ": CREATE FAILED -", ce.message);
      }
    }
  }

  // 2. Set CORS on all buckets
  const allBuckets = ["aismetchik", "avatar-bucket", "user-docs-bucket", "project-docs-bucket"];
  for (const name of allBuckets) {
    try {
      await s3.send(new PutBucketCorsCommand({
        Bucket: name,
        CORSConfiguration: {
          CORSRules: [{
            AllowedOrigins: ["*"],
            AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
            AllowedHeaders: ["*"],
            ExposedHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          }],
        },
      }));
      console.log(name + ": CORS applied");
    } catch (e) {
      console.error(name + ": CORS FAILED -", e.message);
    }
  }

  // 3. Test upload/download on aismetchik
  console.log("\n=== Test Upload/Download (aismetchik) ===");
  const testKey = "test-connectivity-check.txt";
  const testBody = Buffer.from("Yandex S3 connectivity test " + new Date().toISOString());
  try {
    await s3.send(new PutObjectCommand({ Bucket: "aismetchik", Key: testKey, Body: testBody, ContentType: "text/plain" }));
    console.log("Upload: OK (" + testBody.length + " bytes)");

    const getResp = await s3.send(new GetObjectCommand({ Bucket: "aismetchik", Key: testKey }));
    const chunks = [];
    for await (const chunk of getResp.Body) chunks.push(chunk);
    const downloaded = Buffer.concat(chunks).toString();
    console.log("Download:", downloaded.substring(0, 80));
    console.log("Content match:", downloaded === testBody.toString() ? "YES" : "NO");

    // 4. Test presigned URL
    const presigned = await getSignedUrl(s3, new GetObjectCommand({ Bucket: "aismetchik", Key: testKey }), { expiresIn: 3600 });
    console.log("\n=== Presigned URL ===");
    console.log(presigned);

    // Fetch it
    const httpResp = await fetch(presigned);
    console.log("Fetch presigned:", httpResp.status, httpResp.statusText);
    if (httpResp.ok) {
      const text = await httpResp.text();
      console.log("Content:", text.substring(0, 80));
      console.log("Content match:", text === testBody.toString() ? "YES" : "NO");
    }

    // Cleanup
    await s3.send(new DeleteObjectCommand({ Bucket: "aismetchik", Key: testKey }));
    console.log("\nCleanup: test file deleted");
  } catch (e) {
    console.error("Test FAILED:", e.message);
  }

  // 5. Final bucket status
  console.log("\n=== Final Bucket Status ===");
  for (const name of allBuckets) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: name }));
      console.log("  " + name + ": OK");
    } catch (e) {
      console.log("  " + name + ": FAIL (HTTP " + (e.$metadata?.httpStatusCode || "?") + ")");
    }
  }

  await client.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
