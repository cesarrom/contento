import { execFile, spawn } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Readable } from "stream";

const execFileAsync = promisify(execFile);

/**
 * Transcode to a buffer (used for caching the result in MinIO).
 * Writes input to a temp file, runs ffmpeg, returns output as Buffer.
 */
export async function transcodeBuffer(
  inputBuffer: Buffer,
  inputExt: string,
  outputFormat: string
): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const id = `contento-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inputFile = path.join(tmpDir, `${id}${inputExt}`);
  const outputFile = path.join(tmpDir, `${id}.${outputFormat}`);

  fs.writeFileSync(inputFile, inputBuffer);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", inputFile,
      outputFile,
    ]);
    return fs.readFileSync(outputFile);
  } finally {
    try { fs.unlinkSync(inputFile); } catch { /* ignore */ }
    try { fs.unlinkSync(outputFile); } catch { /* ignore */ }
  }
}

/**
 * Transcode and stream output directly to the HTTP response.
 *
 * FFmpeg reads from a temp input file and writes to stdout (`pipe:1`).
 * The caller gets a Web ReadableStream the browser receives progressively —
 * audio/video starts playing as soon as the first bytes arrive.
 *
 * The input temp file is cleaned up once FFmpeg exits.
 */
export function transcodeStream(
  inputBuffer: Buffer,
  inputExt: string,
  outputFormat: string
): ReadableStream<Uint8Array> {
  const tmpDir = os.tmpdir();
  const id = `contento-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inputFile = path.join(tmpDir, `${id}${inputExt}`);

  fs.writeFileSync(inputFile, inputBuffer);

  const ffmpegArgs = [
    "-y",
    "-i", inputFile,
    // Output to stdout as the requested format
    "-f", outputFormat,
    "pipe:1",
  ];

  const proc = spawn("ffmpeg", ffmpegArgs, { stdio: ["ignore", "pipe", "ignore"] });

  return new ReadableStream<Uint8Array>({
    start(controller) {
      proc.stdout.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      proc.stdout.on("end", () => {
        controller.close();
        try { fs.unlinkSync(inputFile); } catch { /* ignore */ }
      });

      proc.stdout.on("error", (err) => {
        controller.error(err);
        try { fs.unlinkSync(inputFile); } catch { /* ignore */ }
      });

      proc.on("error", (err) => {
        controller.error(err);
        try { fs.unlinkSync(inputFile); } catch { /* ignore */ }
      });
    },
    cancel() {
      proc.kill("SIGTERM");
      try { fs.unlinkSync(inputFile); } catch { /* ignore */ }
    },
  });
}

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
