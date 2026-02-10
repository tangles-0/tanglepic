import path from "path";
import { promises as fs } from "fs";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const THUMBNAIL_SIZES = {
  sm: 320,
  lg: 1024,
} as const;

type StorageBackend = "local" | "s3";

const STORAGE_BACKEND = (process.env.STORAGE_BACKEND as StorageBackend) || "local";
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;
const S3_ENDPOINT = process.env.S3_ENDPOINT;

const s3Client =
  STORAGE_BACKEND === "s3" && S3_BUCKET && S3_REGION
    ? new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        forcePathStyle: Boolean(S3_ENDPOINT),
      })
    : null;

export type StoredImage = {
  baseName: string;
  ext: string;
  width: number;
  height: number;
  sizeOriginal: number;
  sizeSm: number;
  sizeLg: number;
};

export async function ensureUploadDirs(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function buildBaseName(uploadedAt: Date): string {
  const iso = uploadedAt.toISOString().replace(/[:.]/g, "-");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${iso}-${suffix}`;
}

function datePathParts(uploadedAt: Date): { year: string; month: string; day: string } {
  const year = uploadedAt.getUTCFullYear().toString();
  const month = (uploadedAt.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = uploadedAt.getUTCDate().toString().padStart(2, "0");
  return { year, month, day };
}

function buildStorageKey(
  baseName: string,
  ext: string,
  size: "original" | "sm" | "lg",
  uploadedAt: Date,
): string {
  const { year, month, day } = datePathParts(uploadedAt);
  return path.posix.join("uploads", year, month, day, size, `${baseName}.${ext}`);
}

export function getImagePath(
  baseName: string,
  ext: string,
  size: "original" | "sm" | "lg",
  uploadedAt: Date,
): string {
  const key = buildStorageKey(baseName, ext, size, uploadedAt);
  return path.join(DATA_DIR, key);
}

export async function storeImageAndThumbnails(
  buffer: Buffer,
  uploadedAt: Date,
): Promise<StoredImage> {
  await ensureUploadDirs();

  const baseName = buildBaseName(uploadedAt);
  const outputFormat = await resolveOutputFormat(buffer);
  const originalPath = getImagePath(baseName, outputFormat.ext, "original", uploadedAt);
  const smPath = getImagePath(baseName, outputFormat.ext, "sm", uploadedAt);
  const lgPath = getImagePath(baseName, outputFormat.ext, "lg", uploadedAt);

  await fs.mkdir(path.dirname(originalPath), { recursive: true });
  await fs.mkdir(path.dirname(smPath), { recursive: true });
  await fs.mkdir(path.dirname(lgPath), { recursive: true });

  const image = sharp(buffer).rotate();
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const originalBuffer = await encodeOutput(image.clone(), outputFormat, 85);
  const smBuffer = await encodeOutput(
    sharp(buffer).rotate().resize({ width: THUMBNAIL_SIZES.sm, withoutEnlargement: true }),
    outputFormat,
    80,
  );
  const lgBuffer = await encodeOutput(
    sharp(buffer).rotate().resize({ width: THUMBNAIL_SIZES.lg, withoutEnlargement: true }),
    outputFormat,
    82,
  );

  if (STORAGE_BACKEND === "s3") {
    await writeToS3(originalPath, outputFormat.ext, originalBuffer);
    await writeToS3(smPath, outputFormat.ext, smBuffer);
    await writeToS3(lgPath, outputFormat.ext, lgBuffer);
  } else {
    await fs.mkdir(path.dirname(originalPath), { recursive: true });
    await fs.mkdir(path.dirname(smPath), { recursive: true });
    await fs.mkdir(path.dirname(lgPath), { recursive: true });
    await fs.writeFile(originalPath, originalBuffer);
    await fs.writeFile(smPath, smBuffer);
    await fs.writeFile(lgPath, lgBuffer);
  }

  return {
    baseName,
    ext: outputFormat.ext,
    width,
    height,
    sizeOriginal: originalBuffer.length,
    sizeSm: smBuffer.length,
    sizeLg: lgBuffer.length,
  };
}

export async function deleteImageFiles(
  baseName: string,
  ext: string,
  uploadedAt: Date,
): Promise<void> {
  const sizes: Array<"original" | "sm" | "lg"> = ["original", "sm", "lg"];
  if (STORAGE_BACKEND === "s3") {
    await Promise.all(
      sizes.map(async (size) => {
        const key = buildStorageKey(baseName, ext, size, uploadedAt);
        await deleteFromS3(key);
      }),
    );
  } else {
    await Promise.all(
      sizes.map(async (size) => {
        const filePath = getImagePath(baseName, ext, size, uploadedAt);
        await fs.rm(filePath, { force: true });
      }),
    );
  }
}

type OutputFormat = {
  ext: string;
  format: "jpeg" | "png" | "webp";
};

async function resolveOutputFormat(buffer: Buffer): Promise<OutputFormat> {
  const metadata = await sharp(buffer).metadata();
  const hasAlpha = Boolean(metadata.hasAlpha);
  const format = metadata.format;

  if (format === "webp") {
    return { ext: "webp", format: "webp" };
  }

  if (format === "png" || format === "gif" || hasAlpha) {
    return { ext: "png", format: "png" };
  }

  return { ext: "jpg", format: "jpeg" };
}

async function encodeOutput(
  image: sharp.Sharp,
  output: OutputFormat,
  quality: number,
): Promise<Buffer> {
  if (output.format === "png") {
    return image.png({ compressionLevel: 9 }).toBuffer();
  }
  if (output.format === "webp") {
    return image.webp({ quality }).toBuffer();
  }
  return image.jpeg({ quality }).toBuffer();
}

async function writeToS3(filePath: string, ext: string, body: Buffer): Promise<void> {
  if (!s3Client || !S3_BUCKET) {
    throw new Error("S3 is not configured.");
  }
  const key = filePath.replace(`${DATA_DIR}/`, "");
  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentTypeForExt(ext),
    }),
  );
}

async function deleteFromS3(key: string): Promise<void> {
  if (!s3Client || !S3_BUCKET) {
    throw new Error("S3 is not configured.");
  }
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }),
  );
}

export async function getImageBuffer(
  baseName: string,
  ext: string,
  size: "original" | "sm" | "lg",
  uploadedAt: Date,
): Promise<Buffer> {
  const key = buildStorageKey(baseName, ext, size, uploadedAt);
  if (STORAGE_BACKEND === "s3") {
    if (!s3Client || !S3_BUCKET) {
      throw new Error("S3 is not configured.");
    }
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    );
    const chunks: Buffer[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  return fs.readFile(getImagePath(baseName, ext, size, uploadedAt));
}

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

