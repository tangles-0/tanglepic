import path from "path";
import { promises as fs } from "fs";
import sharp from "sharp";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const THUMBNAIL_SIZES = {
  sm: 320,
  lg: 1024,
} as const;

export type StoredImage = {
  baseName: string;
  width: number;
  height: number;
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

export function getImagePath(
  baseName: string,
  size: "original" | "sm" | "lg",
  uploadedAt: Date,
): string {
  const { year, month, day } = datePathParts(uploadedAt);
  return path.join(UPLOAD_DIR, year, month, day, size, `${baseName}.jpg`);
}

export async function storeImageAndThumbnails(
  buffer: Buffer,
  uploadedAt: Date,
): Promise<StoredImage> {
  await ensureUploadDirs();

  const baseName = buildBaseName(uploadedAt);
  const originalPath = getImagePath(baseName, "original", uploadedAt);
  const smPath = getImagePath(baseName, "sm", uploadedAt);
  const lgPath = getImagePath(baseName, "lg", uploadedAt);

  await fs.mkdir(path.dirname(originalPath), { recursive: true });
  await fs.mkdir(path.dirname(smPath), { recursive: true });
  await fs.mkdir(path.dirname(lgPath), { recursive: true });

  const image = sharp(buffer).rotate();
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  await image.clone().jpeg({ quality: 85 }).toFile(originalPath);

  await sharp(buffer)
    .rotate()
    .resize({ width: THUMBNAIL_SIZES.sm, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(smPath);

  await sharp(buffer)
    .rotate()
    .resize({ width: THUMBNAIL_SIZES.lg, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(lgPath);

  return { baseName, width, height };
}

export async function deleteImageFiles(
  baseName: string,
  uploadedAt: Date,
): Promise<void> {
  const sizes: Array<"original" | "sm" | "lg"> = ["original", "sm", "lg"];
  await Promise.all(
    sizes.map(async (size) => {
      const filePath = getImagePath(baseName, size, uploadedAt);
      await fs.rm(filePath, { force: true });
    }),
  );
}

