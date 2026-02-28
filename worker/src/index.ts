import { Worker, Job } from "bullmq";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "http://localhost:9000";
const MINIO_ROOT_USER = process.env.MINIO_ROOT_USER ?? "minioadmin";
const MINIO_ROOT_PASSWORD = process.env.MINIO_ROOT_PASSWORD ?? "changeme_minio";
const TRANSFORM_QUEUE = "contento:transforms";

const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: MINIO_ROOT_USER,
    secretAccessKey: MINIO_ROOT_PASSWORD,
  },
  forcePathStyle: true,
});

function parseRedisUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "6379", 10),
    password: u.password || undefined,
    maxRetriesPerRequest: null as null,
  };
}

interface TransformJobData {
  jobId: string;
  projectId: string;
  bucketName: string;
  sourcePath: string;
  outputPath: string;
  params: { format: string };
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function processTransform(job: Job<TransformJobData>) {
  const { bucketName, sourcePath, outputPath, params } = job.data;
  const { format } = params;

  console.log(`[worker] Processing job ${job.id}: ${sourcePath} → ${format}`);

  // Download source from MinIO
  const getCmd = new GetObjectCommand({ Bucket: bucketName, Key: sourcePath });
  const { Body } = await s3.send(getCmd);
  if (!Body) throw new Error("Empty body from MinIO");

  const tmpDir = os.tmpdir();
  const ext = path.extname(sourcePath) || ".tmp";
  const inputFile = path.join(tmpDir, `contento-in-${job.id}${ext}`);
  const outputFile = path.join(tmpDir, `contento-out-${job.id}.${format}`);

  // Write input to temp file
  const inputBuf = await streamToBuffer(Body as Readable);
  fs.writeFileSync(inputFile, inputBuf);

  // Run FFmpeg conversion
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputFile)
      .toFormat(format)
      .on("end", resolve)
      .on("error", reject)
      .save(outputFile);
  });

  // Upload output to MinIO
  const outputBuf = fs.readFileSync(outputFile);
  const putCmd = new PutObjectCommand({
    Bucket: bucketName,
    Key: outputPath,
    Body: outputBuf,
  });
  await s3.send(putCmd);

  // Cleanup temp files
  try {
    fs.unlinkSync(inputFile);
    fs.unlinkSync(outputFile);
  } catch {
    // ignore cleanup errors
  }

  console.log(`[worker] Done: ${outputPath}`);
  return { outputPath };
}

const worker = new Worker<TransformJobData>(
  TRANSFORM_QUEUE,
  processTransform,
  {
    connection: parseRedisUrl(REDIS_URL),
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

console.log("[worker] Contento FFmpeg worker started");
