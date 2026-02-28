import { Queue } from "bullmq";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

function parseRedisUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "6379", 10),
    password: u.password || undefined,
    maxRetriesPerRequest: null as null,
  };
}

export const TRANSFORM_QUEUE = "contento:transforms";

let transformQueue: Queue | null = null;

export function getTransformQueue(): Queue {
  if (!transformQueue) {
    transformQueue = new Queue(TRANSFORM_QUEUE, {
      connection: parseRedisUrl(REDIS_URL),
    });
  }
  return transformQueue;
}

export interface TransformJobData {
  jobId: string;
  projectId: string;
  bucketName: string;
  sourcePath: string;
  outputPath: string;
  params: {
    format: string;
    [key: string]: unknown;
  };
}
