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
const MAX_640_SIZE = {
  width: 640,
  height: 480,
} as const;

export type ImageSize = "original" | "sm" | "lg" | "x640";
export type RotationDirection = "left" | "right";

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
  size: ImageSize,
  uploadedAt: Date,
): string {
  const { year, month, day } = datePathParts(uploadedAt);
  return path.posix.join("uploads", year, month, day, size, `${baseName}.${ext}`);
}

export function getImagePath(
  baseName: string,
  ext: string,
  size: ImageSize,
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
  const sourceOptions = outputFormat.format === "gif" ? { animated: true } : undefined;
  const originalPath = getImagePath(baseName, outputFormat.ext, "original", uploadedAt);
  const smPath = getImagePath(baseName, outputFormat.ext, "sm", uploadedAt);
  const lgPath = getImagePath(baseName, outputFormat.ext, "lg", uploadedAt);

  await fs.mkdir(path.dirname(originalPath), { recursive: true });
  await fs.mkdir(path.dirname(smPath), { recursive: true });
  await fs.mkdir(path.dirname(lgPath), { recursive: true });

  const image = sharp(buffer, sourceOptions).rotate();
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const originalBuffer = await encodeOutput(image.clone(), outputFormat, 85);
  const smBuffer = await encodeOutput(
    sharp(buffer, sourceOptions).rotate().resize({ width: THUMBNAIL_SIZES.sm, withoutEnlargement: true }),
    outputFormat,
    80,
  );
  const lgBuffer = await encodeOutput(
    sharp(buffer, sourceOptions).rotate().resize({ width: THUMBNAIL_SIZES.lg, withoutEnlargement: true }),
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
  const sizes: ImageSize[] = ["original", "sm", "lg", "x640"];
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

export async function rotateImageFiles(
  baseName: string,
  ext: string,
  uploadedAt: Date,
  direction: RotationDirection,
): Promise<{
  width: number;
  height: number;
  sizeOriginal: number;
  sizeSm: number;
  sizeLg: number;
}> {
  const outputFormat = outputFormatFromExt(ext);
  const angle = direction === "right" ? 90 : -90;

  const [original, sm, lg] = await Promise.all([
    readStoredBuffer(baseName, ext, "original", uploadedAt),
    readStoredBuffer(baseName, ext, "sm", uploadedAt),
    readStoredBuffer(baseName, ext, "lg", uploadedAt),
  ]);

  const [rotatedOriginal, rotatedSm, rotatedLg] = await Promise.all([
    encodeOutput(sharp(original).rotate(angle), outputFormat, 85),
    encodeOutput(sharp(sm).rotate(angle), outputFormat, 80),
    encodeOutput(sharp(lg).rotate(angle), outputFormat, 82),
  ]);

  await Promise.all([
    writeStoredBuffer(baseName, ext, "original", uploadedAt, rotatedOriginal),
    writeStoredBuffer(baseName, ext, "sm", uploadedAt, rotatedSm),
    writeStoredBuffer(baseName, ext, "lg", uploadedAt, rotatedLg),
  ]);

  const x640Exists = await hasImageVariant(baseName, ext, "x640", uploadedAt);
  if (x640Exists) {
    const rotated640 = await generate640Buffer(rotatedOriginal, ext);
    await writeStoredBuffer(baseName, ext, "x640", uploadedAt, rotated640);
  }

  const metadata = await sharp(rotatedOriginal).metadata();
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    sizeOriginal: rotatedOriginal.length,
    sizeSm: rotatedSm.length,
    sizeLg: rotatedLg.length,
  };
}

type OutputFormat = {
  ext: string;
  format: "jpeg" | "png" | "webp" | "gif";
};

async function resolveOutputFormat(buffer: Buffer): Promise<OutputFormat> {
  const metadata = await sharp(buffer).metadata();
  const hasAlpha = Boolean(metadata.hasAlpha);
  const format = metadata.format;

  if (format === "gif") {
    return { ext: "gif", format: "gif" };
  }

  if (format === "webp") {
    return { ext: "webp", format: "webp" };
  }

  if (format === "png" || hasAlpha) {
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
  if (output.format === "gif") {
    return image.gif({ effort: 7 }).toBuffer();
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
  size: ImageSize,
  uploadedAt: Date,
): Promise<Buffer> {
  try {
    return await readStoredBuffer(baseName, ext, size, uploadedAt);
  } catch (error) {
    if (size !== "x640") {
      throw error;
    }
  }

  // Lazily generate the 640x480 derivative on first request.
  const original = await readStoredBuffer(baseName, ext, "original", uploadedAt);
  const generated640 = await generate640Buffer(original, ext);
  await writeStoredBuffer(baseName, ext, "x640", uploadedAt, generated640);
  return generated640;
}

async function readStoredBuffer(
  baseName: string,
  ext: string,
  size: ImageSize,
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

async function writeStoredBuffer(
  baseName: string,
  ext: string,
  size: ImageSize,
  uploadedAt: Date,
  data: Buffer,
): Promise<void> {
  const filePath = getImagePath(baseName, ext, size, uploadedAt);
  if (STORAGE_BACKEND === "s3") {
    await writeToS3(filePath, ext, data);
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

export async function hasImageVariant(
  baseName: string,
  ext: string,
  size: ImageSize,
  uploadedAt: Date,
): Promise<boolean> {
  try {
    await readStoredBuffer(baseName, ext, size, uploadedAt);
    return true;
  } catch {
    return false;
  }
}

function outputFormatFromExt(ext: string): OutputFormat {
  if (ext === "png") {
    return { ext: "png", format: "png" };
  }
  if (ext === "webp") {
    return { ext: "webp", format: "webp" };
  }
  if (ext === "gif") {
    return { ext: "gif", format: "gif" };
  }
  return { ext: "jpg", format: "jpeg" };
}

async function generate640Buffer(original: Buffer, ext: string): Promise<Buffer> {
  const sourceOptions = ext === "gif" ? { animated: true } : undefined;
  const resized = sharp(original, sourceOptions).resize({
    width: MAX_640_SIZE.width,
    height: MAX_640_SIZE.height,
    fit: "inside",
    withoutEnlargement: true,
  });
  return encodeOutput(resized, outputFormatFromExt(ext), 82);
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

