import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Storage adapter pattern — auto-detects S3 vs local based on env vars.
//
// Env vars for S3 mode:
//   S3_BUCKET              — bucket name (required to activate S3 mode)
//   S3_REGION              — e.g. us-east-1 (required)
//   S3_ACCESS_KEY_ID       — IAM access key
//   S3_SECRET_ACCESS_KEY   — IAM secret
//   S3_ENDPOINT            — custom endpoint for R2/MinIO (optional)
//   S3_PUBLIC_URL          — custom public URL prefix (optional, e.g.
//                            https://cdn.example.com). When unset, defaults
//                            to https://<bucket>.s3.<region>.amazonaws.com
//
// When S3 env vars are missing, falls back to local filesystem (public/uploads).
// A warning is logged once in production so operators know files won't survive
// redeployments.
// ---------------------------------------------------------------------------

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  // Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'text/markdown',
  // Design files
  'application/postscript', // AI/EPS
  'image/vnd.adobe.photoshop',
  // Archives
  'application/zip',
]);

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class StorageError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'StorageError';
  }
}

// ---------------------------------------------------------------------------
// Storage mode detection
// ---------------------------------------------------------------------------

type StorageMode = 'local' | 's3';

const STORAGE_MODE: StorageMode =
  (process.env.STORAGE_PROVIDER as StorageMode) ||
  (process.env.S3_BUCKET ? 's3' : 'local');

let localWarnEmitted = false;

function warnLocalInProd() {
  if (
    STORAGE_MODE === 'local' &&
    process.env.NODE_ENV === 'production' &&
    !localWarnEmitted
  ) {
    console.warn(
      '[storage] Using local filesystem storage. Files will NOT persist ' +
        'across deploys. Set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and ' +
        'S3_SECRET_ACCESS_KEY to use cloud storage.'
    );
    localWarnEmitted = true;
  }
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

interface StorageAdapter {
  save(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  delete(filename: string): Promise<void>;
  getUrl(filename: string): string;
}

// ---------------------------------------------------------------------------
// Local adapter
// ---------------------------------------------------------------------------

const localAdapter: StorageAdapter = {
  async save(buffer, filename) {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    const filePath = path.join(UPLOAD_DIR, filename);
    await writeFile(filePath, buffer);
    return `/uploads/${filename}`;
  },

  async delete(filename) {
    const fullPath = path.join(UPLOAD_DIR, filename);
    try {
      await unlink(fullPath);
    } catch {
      // File may already be deleted — ignore
    }
  },

  getUrl(filename) {
    return `/uploads/${filename}`;
  },
};

// ---------------------------------------------------------------------------
// S3 adapter (uses @aws-sdk/client-s3 via dynamic import)
// ---------------------------------------------------------------------------

let s3ClientPromise: Promise<StorageAdapter> | null = null;

function getS3Adapter(): Promise<StorageAdapter> {
  if (s3ClientPromise) return s3ClientPromise;

  s3ClientPromise = (async (): Promise<StorageAdapter> => {
    const bucket = process.env.S3_BUCKET!;
    const region = process.env.S3_REGION || 'us-east-1';
    const endpoint = process.env.S3_ENDPOINT || undefined;
    const publicUrl =
      process.env.S3_PUBLIC_URL ||
      (endpoint
        ? `${endpoint.replace(/\/$/, '')}/${bucket}`
        : `https://${bucket}.s3.${region}.amazonaws.com`);

    try {
      // Dynamic import so the app still works when the SDK isn't installed.
      // Dynamic import — the SDK is an optional dependency. The variable
      // indirection prevents TypeScript from statically resolving the module.
      const sdkModule = '@aws-sdk/client-s3';
       
      const mod: any = await import(/* webpackIgnore: true */ sdkModule);
      const { S3Client, PutObjectCommand, DeleteObjectCommand } = mod;

      const client = new S3Client({
        region,
        ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      });

      return {
        async save(buffer, filename, mimeType) {
          await client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: filename,
              Body: buffer,
              ContentType: mimeType,
              CacheControl: 'public, max-age=31536000, immutable',
            })
          );
          return `${publicUrl}/${filename}`;
        },

        async delete(filename) {
          try {
            await client.send(
              new DeleteObjectCommand({
                Bucket: bucket,
                Key: filename,
              })
            );
          } catch {
            // Best-effort deletion — don't crash the caller
          }
        },

        getUrl(filename) {
          return `${publicUrl}/${filename}`;
        },
      };
    } catch {
      // SDK not installed — return a stub that throws clear instructions.
      console.error(
        '[storage] S3 storage is configured but @aws-sdk/client-s3 is not ' +
          'installed. Run: npm install @aws-sdk/client-s3'
      );
      return {
        async save() {
          throw new StorageError(
            'S3 storage is configured but the AWS SDK is not installed. ' +
              'Run `npm install @aws-sdk/client-s3` or switch to local storage ' +
              'by removing the S3_BUCKET env var.',
            503
          );
        },
        async delete() {
          // Silently ignore deletes when SDK is missing
        },
        getUrl(filename) {
          return `/uploads/${filename}`;
        },
      };
    }
  })();

  return s3ClientPromise;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExtension(filename: string): string {
  return path.extname(filename) || '';
}

function generateFilename(originalName: string, identityId: string): string {
  const ext = getExtension(originalName);
  return `${identityId}-${crypto.randomBytes(12).toString('hex')}${ext}`;
}

async function getAdapter(): Promise<StorageAdapter> {
  if (STORAGE_MODE === 's3') {
    return getS3Adapter();
  }
  warnLocalInProd();
  return localAdapter;
}

// ---------------------------------------------------------------------------
// Public API — signatures unchanged from original
// ---------------------------------------------------------------------------

export async function saveFile(
  file: File,
  identityId: string
): Promise<{ path: string; filename: string; mimeType: string; size: number }> {
  if (file.size > MAX_FILE_SIZE) {
    throw new StorageError('File exceeds maximum size of 50MB');
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new StorageError(`File type "${file.type}" is not allowed`);
  }

  const uniqueName = generateFilename(file.name, identityId);
  const buffer = Buffer.from(await file.arrayBuffer());

  const adapter = await getAdapter();
  const url = await adapter.save(buffer, uniqueName, file.type);

  return {
    path: url,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  };
}

export async function deleteFile(storagePath: string): Promise<void> {
  const adapter = await getAdapter();

  if (STORAGE_MODE === 's3') {
    // For S3, extract the key from the full URL or path
    const filename = storagePath.split('/').pop() || storagePath;
    await adapter.delete(filename);
  } else {
    // Local mode: storagePath is like "/uploads/filename"
    const filename = storagePath.replace(/^\/uploads\//, '');
    await adapter.delete(filename);
  }
}

export function getFileUrl(storagePath: string): string {
  // In S3 mode the stored path is already a full URL. In local mode it's
  // a relative path like /uploads/xyz. Either way the stored value is the
  // URL — just return it.
  return storagePath;
}
