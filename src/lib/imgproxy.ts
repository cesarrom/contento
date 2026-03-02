import { createHmac } from "crypto";

const IMGPROXY_KEY = process.env.IMGPROXY_KEY ?? "";
const IMGPROXY_SALT = process.env.IMGPROXY_SALT ?? "";
const IMGPROXY_ENDPOINT =
  process.env.IMGPROXY_ENDPOINT ?? "http://localhost:8080";

export interface ImgproxyOptions {
  width?: number;
  height?: number;
  format?: string; // webp | avif | jpg | png | gif
  resizingType?: "fit" | "fill" | "auto";
  gravity?: string;
  quality?: number;
  blur?: number;
  dpr?: number;
}

function urlSafeBase64(str: string): string {
  return Buffer.from(str).toString("base64url");
}

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}

/**
 * Build a signed imgproxy URL.
 * source: s3://bucket-name/path/to/file
 */
export function buildImgproxyUrl(
  source: string,
  opts: ImgproxyOptions = {}
): string {
  const {
    width = 0,
    height = 0,
    resizingType = "auto",
    format,
    gravity = "sm",
    quality,
    blur,
    dpr,
  } = opts;

  const encodedSource = urlSafeBase64(source);

  // Build processing options chain
  const processingOptions: string[] = [
    `rs:${resizingType}:${width}:${height}`,
    `g:${gravity}`,
  ];
  if (quality) processingOptions.push(`q:${quality}`);
  if (blur) processingOptions.push(`bl:${blur}`);
  if (dpr) processingOptions.push(`dpr:${dpr}`);

  const extension = format ? `.${format}` : "";
  const path = `/${processingOptions.join("/")}/${encodedSource}${extension}`;

  if (!IMGPROXY_KEY || !IMGPROXY_SALT) {
    if (process.env.NODE_ENV === "production" && process.env.IMGPROXY_ALLOW_INSECURE !== "1") {
      throw new Error("IMGPROXY_KEY/IMGPROXY_SALT must be set in production (or set IMGPROXY_ALLOW_INSECURE=1)");
    }
    return `${IMGPROXY_ENDPOINT}/insecure${path}`;
  }

  const keyBuf = hexToBuffer(IMGPROXY_KEY);
  const saltBuf = hexToBuffer(IMGPROXY_SALT);

  const hmac = createHmac("sha256", keyBuf);
  hmac.update(saltBuf);
  hmac.update(path);
  const signature = hmac.digest().toString("base64url").slice(0, 32);

  return `${IMGPROXY_ENDPOINT}/${signature}${path}`;
}

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "tiff",
  "bmp",
  "ico",
  "svg",
]);

export function isImage(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm", "flv"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "aac", "flac", "ogg", "m4a"]);

export function isVideo(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.has(ext);
}

export function isAudio(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTENSIONS.has(ext);
}
