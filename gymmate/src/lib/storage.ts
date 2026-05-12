import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT_FOR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class StorageValidationError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = "StorageValidationError";
  }
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new StorageValidationError(
      "R2 storage is not configured (missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)",
      500
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new StorageValidationError(
      "R2 storage is not configured (missing R2_BUCKET_NAME)",
      500
    );
  }
  return bucket;
}

export function publicUrlFor(key: string): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) {
    throw new StorageValidationError(
      "R2 storage is not configured (missing R2_PUBLIC_URL)",
      500
    );
  }
  return `${base.replace(/\/$/, "")}/${key}`;
}

export function generateKey(prefix: string, mime: string): string {
  const ext = EXT_FOR_MIME[mime] ?? "bin";
  const id = crypto.randomBytes(16).toString("hex");
  return `${prefix.replace(/^\/+|\/+$/g, "")}/${id}.${ext}`;
}

export interface UploadResult {
  key: string;
  url: string;
}

export async function uploadFile(
  file: File,
  key: string,
  opts: { allowedTypes?: Set<string>; maxSizeBytes?: number } = {}
): Promise<UploadResult> {
  const allowedTypes = opts.allowedTypes ?? ALLOWED_IMAGE_TYPES;
  const maxSize = opts.maxSizeBytes ?? MAX_PHOTO_SIZE_BYTES;

  if (!allowedTypes.has(file.type)) {
    throw new StorageValidationError(
      `Unsupported file type: ${file.type}. Allowed: ${[...allowedTypes].join(", ")}`
    );
  }
  if (file.size > maxSize) {
    throw new StorageValidationError(
      `File exceeds ${Math.round(maxSize / 1024 / 1024)} MB limit`
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: buffer.length,
    })
  );

  return { key, url: publicUrlFor(key) };
}

export async function deleteFile(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key })
  );
}

export async function signedDownloadUrl(key: string, expiresInSec = 3600): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn: expiresInSec }
  );
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL
  );
}

export function keyFromPublicUrl(url: string): string | null {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return null;
  const normalized = base.replace(/\/$/, "");
  if (!url.startsWith(normalized + "/")) return null;
  return url.slice(normalized.length + 1);
}
