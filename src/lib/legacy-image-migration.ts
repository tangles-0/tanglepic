import path from "path";
import { promises as fs } from "fs";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { db } from "@/db";
import { images } from "@/db/schema";

type StorageBackend = "local" | "s3";

const DATA_DIR = path.join(process.cwd(), "data");
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

type ImageRow = {
  id: string;
  baseName: string;
  ext: string;
  uploadedAt: Date;
};

export type LegacyMigrationReport = {
  backend: StorageBackend;
  checkedImages: number;
  migrated: number;
  skippedAlreadyMigrated: number;
  missingLegacySource: number;
  errors: number;
  migratedExamples: string[];
  skippedExamples: string[];
  missingExamples: string[];
  errorExamples: string[];
};

function datePathParts(uploadedAt: Date): { year: string; month: string; day: string } {
  return {
    year: String(uploadedAt.getUTCFullYear()),
    month: String(uploadedAt.getUTCMonth() + 1).padStart(2, "0"),
    day: String(uploadedAt.getUTCDate()).padStart(2, "0"),
  };
}

function buildLegacyKey(baseName: string, ext: string, size: "original" | "sm" | "lg", uploadedAt: Date): string {
  const { year, month, day } = datePathParts(uploadedAt);
  return path.posix.join("uploads", year, month, day, size, `${baseName}.${ext}`);
}

function buildNewKey(baseName: string, ext: string, size: "original" | "sm" | "lg", uploadedAt: Date): string {
  const { year, month, day } = datePathParts(uploadedAt);
  return path.posix.join("uploads", year, month, day, "image", size, `${baseName}.${ext}`);
}

function absForKey(key: string): string {
  return path.join(DATA_DIR, key);
}

async function existsLocal(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function existsS3(key: string): Promise<boolean> {
  if (!s3Client || !S3_BUCKET) return false;
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

async function migrateOneLocal(oldKey: string, newKey: string): Promise<"migrated" | "skip" | "missing"> {
  const oldPath = absForKey(oldKey);
  const newPath = absForKey(newKey);
  const [oldExists, newExists] = await Promise.all([existsLocal(oldPath), existsLocal(newPath)]);
  if (newExists) return "skip";
  if (!oldExists) return "missing";
  await fs.mkdir(path.dirname(newPath), { recursive: true });
  await fs.copyFile(oldPath, newPath);
  await fs.rm(oldPath, { force: true });
  return "migrated";
}

async function migrateOneS3(oldKey: string, newKey: string): Promise<"migrated" | "skip" | "missing"> {
  if (!s3Client || !S3_BUCKET) {
    throw new Error("S3 is not configured.");
  }
  const [oldExists, newExists] = await Promise.all([existsS3(oldKey), existsS3(newKey)]);
  if (newExists) return "skip";
  if (!oldExists) return "missing";

  await s3Client.send(
    new CopyObjectCommand({
      Bucket: S3_BUCKET,
      Key: newKey,
      CopySource: `${S3_BUCKET}/${oldKey}`,
    }),
  );
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: oldKey,
    }),
  );
  return "migrated";
}

function pushSample(target: string[], value: string): void {
  if (target.length < 20) {
    target.push(value);
  }
}

export async function migrateLegacyImageStorage(): Promise<LegacyMigrationReport> {
  const report: LegacyMigrationReport = {
    backend: STORAGE_BACKEND,
    checkedImages: 0,
    migrated: 0,
    skippedAlreadyMigrated: 0,
    missingLegacySource: 0,
    errors: 0,
    migratedExamples: [],
    skippedExamples: [],
    missingExamples: [],
    errorExamples: [],
  };

  const rows = await db
    .select({
      id: images.id,
      baseName: images.baseName,
      ext: images.ext,
      uploadedAt: images.uploadedAt,
    })
    .from(images);

  const sizes: Array<"original" | "sm" | "lg"> = ["original", "sm", "lg"];

  for (const row of rows as ImageRow[]) {
    report.checkedImages += 1;
    for (const size of sizes) {
      const oldKey = buildLegacyKey(row.baseName, row.ext, size, row.uploadedAt);
      const newKey = buildNewKey(row.baseName, row.ext, size, row.uploadedAt);
      const label = `${row.id}:${size}`;
      try {
        const outcome =
          STORAGE_BACKEND === "s3"
            ? await migrateOneS3(oldKey, newKey)
            : await migrateOneLocal(oldKey, newKey);
        if (outcome === "migrated") {
          report.migrated += 1;
          pushSample(report.migratedExamples, `${label} ${oldKey} -> ${newKey}`);
        } else if (outcome === "skip") {
          report.skippedAlreadyMigrated += 1;
          pushSample(report.skippedExamples, `${label} ${newKey}`);
        } else {
          report.missingLegacySource += 1;
          pushSample(report.missingExamples, `${label} ${oldKey}`);
        }
      } catch (error) {
        report.errors += 1;
        const message = error instanceof Error ? error.message : "unknown error";
        pushSample(report.errorExamples, `${label} ${message}`);
      }
    }
  }

  return report;
}

