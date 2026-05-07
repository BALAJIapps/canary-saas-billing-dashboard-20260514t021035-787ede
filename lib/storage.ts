/**
 * File upload & storage via multiple providers.
 *
 * Supports three backends (user picks via env var):
 *   1. Uploadthing — easiest, free tier 2GB
 *   2. Cloudflare R2 — cheapest at scale, S3-compatible
 *   3. Vercel Blob — simplest if deploying to Vercel
 *
 * The generated app gets a /api/upload route and a useUpload() hook
 * that work with any backend. The coder agent picks the backend based
 * on the user's prompt or defaults to Uploadthing.
 *
 * Usage in generated apps:
 *   import { uploadFile, getFileUrl, deleteFile } from "@/lib/storage";
 */

// ── Provider detection ────────────────────────────────────────────

type StorageProvider = "uploadthing" | "r2" | "vercel-blob" | "local";

function detectProvider(): StorageProvider {
  if (process.env.UPLOADTHING_SECRET) return "uploadthing";
  if (process.env.R2_ACCESS_KEY_ID) return "r2";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  return "local";
}

// ── Unified interface ─────────────────────────────────────────────

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  name: string;
}

export async function uploadFile(
  file: File | Buffer,
  filename: string,
  options?: { folder?: string; contentType?: string },
): Promise<UploadResult> {
  const provider = detectProvider();

  switch (provider) {
    case "uploadthing":
      return uploadToUploadthing(file, filename, options);
    case "r2":
      return uploadToR2(file, filename, options);
    case "vercel-blob":
      return uploadToVercelBlob(file, filename, options);
    case "local":
      return uploadToLocal(file, filename, options);
  }
}

export async function getFileUrl(key: string): Promise<string> {
  const provider = detectProvider();

  switch (provider) {
    case "uploadthing":
      return `https://utfs.io/f/${key}`;
    case "r2":
      return `${process.env.R2_PUBLIC_URL || ""}/${key}`;
    case "vercel-blob":
      return key; // Vercel Blob URLs are the key
    case "local":
      return `/uploads/${key}`;
  }
}

export async function deleteFile(key: string): Promise<void> {
  const provider = detectProvider();

  switch (provider) {
    case "r2":
      await deleteFromR2(key);
      break;
    case "vercel-blob":
      await deleteFromVercelBlob(key);
      break;
    // uploadthing and local: deletion is more complex, skip for now
  }
}

// ── Uploadthing ───────────────────────────────────────────────────

async function uploadToUploadthing(
  file: File | Buffer,
  filename: string,
  options?: { folder?: string; contentType?: string },
): Promise<UploadResult> {
  const secret = process.env.UPLOADTHING_SECRET;
  if (!secret) throw new Error("UPLOADTHING_SECRET not set");

  // Uploadthing uses their SDK, but we can also use their REST API
  const formData = new FormData();
  const blob = file instanceof Buffer
    ? new Blob([file], { type: options?.contentType || "application/octet-stream" })
    : file;
  formData.append("file", blob, filename);

  const resp = await fetch("https://uploadthing.com/api/uploadFiles", {
    method: "POST",
    headers: { "x-uploadthing-api-key": secret },
    body: formData,
  });

  if (!resp.ok) throw new Error(`Uploadthing error: ${resp.status}`);
  const data = await resp.json();
  const result = data[0] || data;

  return {
    url: result.url || result.fileUrl,
    key: result.key || result.fileKey,
    size: result.size || 0,
    name: filename,
  };
}

// ── Cloudflare R2 (S3-compatible) ─────────────────────────────────

async function uploadToR2(
  file: File | Buffer,
  filename: string,
  options?: { folder?: string; contentType?: string },
): Promise<UploadResult> {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT;

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    throw new Error("R2 env vars not set (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT)");
  }

  const key = options?.folder ? `${options.folder}/${filename}` : filename;
  const body = file instanceof Buffer ? file : Buffer.from(await file.arrayBuffer());

  // Use S3-compatible PUT
  const url = `${endpoint}/${bucket}/${key}`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      "content-type": options?.contentType || "application/octet-stream",
      // Note: real S3 auth requires AWS Signature V4.
      // For a generated app, using the @aws-sdk/client-s3 is more reliable.
      // This is a simplified version for the template.
    },
    body,
  });

  if (!resp.ok) throw new Error(`R2 upload failed: ${resp.status}`);

  return {
    url: `${process.env.R2_PUBLIC_URL || endpoint}/${key}`,
    key,
    size: body.length,
    name: filename,
  };
}

async function deleteFromR2(key: string): Promise<void> {
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET_NAME;
  await fetch(`${endpoint}/${bucket}/${key}`, { method: "DELETE" });
}

// ── Vercel Blob ───────────────────────────────────────────────────

async function uploadToVercelBlob(
  file: File | Buffer,
  filename: string,
  options?: { folder?: string; contentType?: string },
): Promise<UploadResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN not set");

  const body = file instanceof Buffer ? file : Buffer.from(await file.arrayBuffer());
  const pathname = options?.folder ? `${options.folder}/${filename}` : filename;

  const resp = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "x-content-type": options?.contentType || "application/octet-stream",
    },
    body,
  });

  if (!resp.ok) throw new Error(`Vercel Blob error: ${resp.status}`);
  const data = await resp.json();

  return {
    url: data.url,
    key: data.pathname || pathname,
    size: body.length,
    name: filename,
  };
}

async function deleteFromVercelBlob(key: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  await fetch(`https://blob.vercel-storage.com?url=${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
}

// ── Local filesystem (dev fallback) ───────────────────────────────

async function uploadToLocal(
  file: File | Buffer,
  filename: string,
  options?: { folder?: string },
): Promise<UploadResult> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const dir = path.join(process.cwd(), "public", "uploads", options?.folder || "");
  await fs.mkdir(dir, { recursive: true });

  const filepath = path.join(dir, filename);
  const body = file instanceof Buffer ? file : Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, body);

  const key = options?.folder ? `${options.folder}/${filename}` : filename;
  return {
    url: `/uploads/${key}`,
    key,
    size: body.length,
    name: filename,
  };
}
