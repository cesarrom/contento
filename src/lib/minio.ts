import {
  S3Client,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  HeadBucketCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import type { ReadableStream as WebReadableStream } from "stream/web";

const endpoint = process.env.MINIO_ENDPOINT ?? "http://localhost:9000";
const publicEndpoint =
  process.env.MINIO_PUBLIC_ENDPOINT ?? "http://localhost:9000";

export const s3 = new S3Client({
  endpoint,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER ?? "minioadmin",
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "changeme_minio",
  },
  forcePathStyle: true,
});

export async function ensureBucket(
  bucketName: string,
  isPublic: boolean
): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
  }

  if (isPublic) {
    await setBucketPublic(bucketName);
  } else {
    await setBucketPrivate(bucketName);
  }
}

export async function setBucketPublic(bucketName: string): Promise<void> {
  const policy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  });
  await s3.send(
    new PutBucketPolicyCommand({ Bucket: bucketName, Policy: policy })
  );
}

export async function setBucketPrivate(bucketName: string): Promise<void> {
  const policy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [],
  });
  await s3.send(
    new PutBucketPolicyCommand({ Bucket: bucketName, Policy: policy })
  );
}

export async function presignUpload(
  bucketName: string,
  key: string,
  contentType: string,
  expiresIn: number
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });
  const internalUrl = await getSignedUrl(s3, command, { expiresIn });
  // Replace internal endpoint with public endpoint for returning to clients
  return internalUrl.replace(endpoint, publicEndpoint);
}

export async function presignDownload(
  bucketName: string,
  key: string,
  expiresIn: number
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  const internalUrl = await getSignedUrl(s3, command, { expiresIn });
  return internalUrl.replace(endpoint, publicEndpoint);
}

export async function getObject(
  bucketName: string,
  key: string
): Promise<NodeJS.ReadableStream> {
  const result = await s3.send(
    new GetObjectCommand({ Bucket: bucketName, Key: key })
  );
  if (!result.Body) throw new Error(`Empty body for ${bucketName}/${key}`);
  return result.Body as unknown as NodeJS.ReadableStream;
}

export async function getObjectResponse(
  bucketName: string,
  key: string,
  range?: string
): Promise<{
  body: NodeJS.ReadableStream;
  contentType: string | undefined;
  contentLength: number | undefined;
  contentRange: string | undefined;
}> {
  const result = await s3.send(
    new GetObjectCommand({ Bucket: bucketName, Key: key, Range: range })
  );
  if (!result.Body) throw new Error(`Empty body for ${bucketName}/${key}`);
  return {
    body: result.Body as unknown as NodeJS.ReadableStream,
    contentType: result.ContentType,
    contentLength: result.ContentLength,
    contentRange: result.ContentRange,
  };
}

export async function putObject(
  bucketName: string,
  key: string,
  body: Buffer
): Promise<void> {
  await s3.send(
    new PutObjectCommand({ Bucket: bucketName, Key: key, Body: body })
  );
}

export async function putObjectStream(
  bucketName: string,
  key: string,
  body: WebReadableStream<Uint8Array> | NodeJS.ReadableStream,
  contentType?: string
): Promise<void> {
  const nodeBody: Readable =
    typeof (body as WebReadableStream<Uint8Array>).getReader === "function"
      ? (Readable.fromWeb(body as WebReadableStream<Uint8Array>) as unknown as Readable)
      : (body as unknown as Readable);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: nodeBody,
      ContentType: contentType,
    })
  );
}

export async function deleteObject(
  bucketName: string,
  key: string
): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
}

export async function listObjects(
  bucketName: string,
  prefix?: string,
  maxKeys = 200
) {
  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys,
    })
  );
  return result.Contents ?? [];
}

export function publicUrl(bucketName: string, key: string): string {
  return `${publicEndpoint}/${bucketName}/${key}`;
}
