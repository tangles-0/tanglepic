import { randomBytes, randomUUID } from "crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  documentShares,
  documents,
  fileShares,
  files,
  images,
  shares,
  videoShares,
  videos,
} from "@/db/schema";
import { deleteImageFiles } from "@/lib/storage";

export type MediaKind = "image" | "video" | "document" | "other";
export type PreviewStatus = "pending" | "ready" | "failed";

export type MediaEntry = {
  id: string;
  kind: MediaKind;
  baseName: string;
  originalFileName?: string;
  ext: string;
  mimeType: string;
  albumId?: string;
  albumCaption?: string;
  albumOrder: number;
  uploadedAt: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  pageCount?: number;
  sizeOriginal: number;
  sizeSm: number;
  sizeLg: number;
  previewStatus: PreviewStatus;
  previewError?: string;
  shared?: boolean;
};

const SHARE_CODE_LENGTH = 8;

function mapImageRow(row: typeof images.$inferSelect): MediaEntry {
  return {
    id: row.id,
    kind: "image",
    baseName: row.baseName,
    originalFileName: row.originalFileName ?? undefined,
    ext: row.ext,
    mimeType: `image/${row.ext === "jpg" ? "jpeg" : row.ext}`,
    albumId: row.albumId ?? undefined,
    albumCaption: row.albumCaption ?? undefined,
    albumOrder: row.albumOrder,
    uploadedAt: row.uploadedAt.toISOString(),
    width: row.width,
    height: row.height,
    sizeOriginal: row.sizeOriginal,
    sizeSm: row.sizeSm,
    sizeLg: row.sizeLg,
    previewStatus: "ready",
  };
}

function mapVideoRow(row: typeof videos.$inferSelect): MediaEntry {
  return {
    id: row.id,
    kind: "video",
    baseName: row.baseName,
    originalFileName: row.originalFileName ?? undefined,
    ext: row.ext,
    mimeType: row.mimeType,
    albumId: row.albumId ?? undefined,
    albumCaption: row.albumCaption ?? undefined,
    albumOrder: row.albumOrder,
    uploadedAt: row.uploadedAt.toISOString(),
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    durationSeconds: row.durationSeconds ?? undefined,
    sizeOriginal: row.sizeOriginal,
    sizeSm: row.sizeSm,
    sizeLg: row.sizeLg,
    previewStatus: (row.previewStatus as PreviewStatus) ?? "pending",
    previewError: row.previewError ?? undefined,
  };
}

function mapDocumentRow(row: typeof documents.$inferSelect): MediaEntry {
  return {
    id: row.id,
    kind: "document",
    baseName: row.baseName,
    originalFileName: row.originalFileName ?? undefined,
    ext: row.ext,
    mimeType: row.mimeType,
    albumId: row.albumId ?? undefined,
    albumCaption: row.albumCaption ?? undefined,
    albumOrder: row.albumOrder,
    uploadedAt: row.uploadedAt.toISOString(),
    pageCount: row.pageCount ?? undefined,
    sizeOriginal: row.sizeOriginal,
    sizeSm: row.sizeSm,
    sizeLg: row.sizeLg,
    previewStatus: (row.previewStatus as PreviewStatus) ?? "pending",
    previewError: row.previewError ?? undefined,
  };
}

function mapFileRow(row: typeof files.$inferSelect): MediaEntry {
  return {
    id: row.id,
    kind: "other",
    baseName: row.baseName,
    originalFileName: row.originalFileName ?? undefined,
    ext: row.ext,
    mimeType: row.mimeType,
    albumId: row.albumId ?? undefined,
    albumCaption: row.albumCaption ?? undefined,
    albumOrder: row.albumOrder,
    uploadedAt: row.uploadedAt.toISOString(),
    sizeOriginal: row.sizeOriginal,
    sizeSm: row.sizeSm,
    sizeLg: row.sizeLg,
    previewStatus: (row.previewStatus as PreviewStatus) ?? "pending",
    previewError: row.previewError ?? undefined,
  };
}

async function generateShareCode(kind: MediaKind): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const raw = randomBytes(6);
    const code = raw
      .toString("base64url")
      .replace(/[-_]/g, "0")
      .slice(0, SHARE_CODE_LENGTH);
    const existing =
      kind === "image"
        ? await db.select({ id: shares.id }).from(shares).where(eq(shares.code, code)).limit(1)
        : kind === "video"
          ? await db
              .select({ id: videoShares.id })
              .from(videoShares)
              .where(eq(videoShares.code, code))
              .limit(1)
          : kind === "document"
            ? await db
                .select({ id: documentShares.id })
                .from(documentShares)
                .where(eq(documentShares.code, code))
                .limit(1)
            : await db.select({ id: fileShares.id }).from(fileShares).where(eq(fileShares.code, code)).limit(1);
    if (!existing[0]) {
      return code;
    }
  }
  return randomUUID().replace(/-/g, "").slice(0, SHARE_CODE_LENGTH);
}

export async function addMediaForUser(input: {
  userId: string;
  kind: MediaKind;
  baseName: string;
  originalFileName?: string;
  ext: string;
  mimeType: string;
  albumId?: string;
  albumCaption?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  pageCount?: number;
  sizeOriginal: number;
  sizeSm: number;
  sizeLg: number;
  previewStatus: PreviewStatus;
  previewError?: string;
  uploadedAt: string;
}): Promise<MediaEntry> {
  const id = randomUUID();
  const uploadedAt = new Date(input.uploadedAt);

  let albumOrder = 0;
  if (input.albumId) {
    const [maxOrderRow] =
      input.kind === "image"
        ? await db
            .select({ value: sql<number>`coalesce(max(${images.albumOrder}), 0)` })
            .from(images)
            .where(and(eq(images.userId, input.userId), eq(images.albumId, input.albumId)))
        : input.kind === "video"
          ? await db
              .select({ value: sql<number>`coalesce(max(${videos.albumOrder}), 0)` })
              .from(videos)
              .where(and(eq(videos.userId, input.userId), eq(videos.albumId, input.albumId)))
          : input.kind === "document"
            ? await db
                .select({ value: sql<number>`coalesce(max(${documents.albumOrder}), 0)` })
                .from(documents)
                .where(and(eq(documents.userId, input.userId), eq(documents.albumId, input.albumId)))
            : await db
                .select({ value: sql<number>`coalesce(max(${files.albumOrder}), 0)` })
                .from(files)
                .where(and(eq(files.userId, input.userId), eq(files.albumId, input.albumId)));
    albumOrder = Number(maxOrderRow?.value ?? 0) + 1;
  }

  if (input.kind === "image") {
    await db.insert(images).values({
      id,
      userId: input.userId,
      albumId: input.albumId ?? null,
      albumCaption: input.albumCaption ?? null,
      albumOrder,
      baseName: input.baseName,
      originalFileName: input.originalFileName ?? null,
      ext: input.ext,
      width: input.width ?? 0,
      height: input.height ?? 0,
      sizeOriginal: input.sizeOriginal,
      sizeSm: input.sizeSm,
      sizeLg: input.sizeLg,
      uploadedAt,
    });
    return {
      id,
      kind: "image",
      baseName: input.baseName,
      originalFileName: input.originalFileName,
      ext: input.ext,
      mimeType: input.mimeType,
      albumId: input.albumId,
      albumCaption: input.albumCaption,
      albumOrder,
      uploadedAt: uploadedAt.toISOString(),
      width: input.width,
      height: input.height,
      sizeOriginal: input.sizeOriginal,
      sizeSm: input.sizeSm,
      sizeLg: input.sizeLg,
      previewStatus: "ready",
    };
  }

  if (input.kind === "video") {
    await db.insert(videos).values({
      id,
      userId: input.userId,
      albumId: input.albumId ?? null,
      albumCaption: input.albumCaption ?? null,
      albumOrder,
      baseName: input.baseName,
      originalFileName: input.originalFileName ?? null,
      ext: input.ext,
      mimeType: input.mimeType,
      durationSeconds: input.durationSeconds ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      sizeOriginal: input.sizeOriginal,
      sizeSm: input.sizeSm,
      sizeLg: input.sizeLg,
      previewStatus: input.previewStatus,
      previewError: input.previewError ?? null,
      uploadedAt,
    });
  } else if (input.kind === "document") {
    await db.insert(documents).values({
      id,
      userId: input.userId,
      albumId: input.albumId ?? null,
      albumCaption: input.albumCaption ?? null,
      albumOrder,
      baseName: input.baseName,
      originalFileName: input.originalFileName ?? null,
      ext: input.ext,
      mimeType: input.mimeType,
      pageCount: input.pageCount ?? null,
      sizeOriginal: input.sizeOriginal,
      sizeSm: input.sizeSm,
      sizeLg: input.sizeLg,
      previewStatus: input.previewStatus,
      previewError: input.previewError ?? null,
      uploadedAt,
    });
  } else {
    await db.insert(files).values({
      id,
      userId: input.userId,
      albumId: input.albumId ?? null,
      albumCaption: input.albumCaption ?? null,
      albumOrder,
      baseName: input.baseName,
      originalFileName: input.originalFileName ?? null,
      ext: input.ext,
      mimeType: input.mimeType,
      sizeOriginal: input.sizeOriginal,
      sizeSm: input.sizeSm,
      sizeLg: input.sizeLg,
      previewStatus: input.previewStatus,
      previewError: input.previewError ?? null,
      uploadedAt,
    });
  }

  return {
    id,
    kind: input.kind,
    baseName: input.baseName,
    originalFileName: input.originalFileName,
    ext: input.ext,
    mimeType: input.mimeType,
    albumId: input.albumId,
    albumCaption: input.albumCaption,
    albumOrder,
    uploadedAt: uploadedAt.toISOString(),
    width: input.width,
    height: input.height,
    durationSeconds: input.durationSeconds,
    pageCount: input.pageCount,
    sizeOriginal: input.sizeOriginal,
    sizeSm: input.sizeSm,
    sizeLg: input.sizeLg,
    previewStatus: input.previewStatus,
    previewError: input.previewError,
  };
}

export async function updateOriginalFileNameForUser(input: {
  userId: string;
  kind: MediaKind;
  mediaId: string;
  originalFileName: string | null;
}): Promise<MediaEntry | undefined> {
  if (input.kind === "image") {
    const [row] = await db
      .update(images)
      .set({ originalFileName: input.originalFileName })
      .where(and(eq(images.userId, input.userId), eq(images.id, input.mediaId)))
      .returning();
    return row ? mapImageRow(row) : undefined;
  }
  if (input.kind === "video") {
    const [row] = await db
      .update(videos)
      .set({ originalFileName: input.originalFileName })
      .where(and(eq(videos.userId, input.userId), eq(videos.id, input.mediaId)))
      .returning();
    return row ? mapVideoRow(row) : undefined;
  }
  if (input.kind === "document") {
    const [row] = await db
      .update(documents)
      .set({ originalFileName: input.originalFileName })
      .where(and(eq(documents.userId, input.userId), eq(documents.id, input.mediaId)))
      .returning();
    return row ? mapDocumentRow(row) : undefined;
  }
  const [row] = await db
    .update(files)
    .set({ originalFileName: input.originalFileName })
    .where(and(eq(files.userId, input.userId), eq(files.id, input.mediaId)))
    .returning();
  return row ? mapFileRow(row) : undefined;
}

export async function listMediaForUser(userId: string): Promise<MediaEntry[]> {
  const [imageRows, videoRows, documentRows, fileRows] = await Promise.all([
    db
      .select({ image: images, shareId: shares.id })
      .from(images)
      .leftJoin(shares, and(eq(shares.imageId, images.id), eq(shares.userId, userId)))
      .where(eq(images.userId, userId)),
    db
      .select({ video: videos, shareId: videoShares.id })
      .from(videos)
      .leftJoin(videoShares, and(eq(videoShares.videoId, videos.id), eq(videoShares.userId, userId)))
      .where(eq(videos.userId, userId)),
    db
      .select({ document: documents, shareId: documentShares.id })
      .from(documents)
      .leftJoin(
        documentShares,
        and(eq(documentShares.documentId, documents.id), eq(documentShares.userId, userId)),
      )
      .where(eq(documents.userId, userId)),
    db
      .select({ file: files, shareId: fileShares.id })
      .from(files)
      .leftJoin(fileShares, and(eq(fileShares.fileId, files.id), eq(fileShares.userId, userId)))
      .where(eq(files.userId, userId)),
  ]);

  const flattened = [
    ...imageRows.map((row) => ({ ...mapImageRow(row.image), shared: Boolean(row.shareId) })),
    ...videoRows.map((row) => ({ ...mapVideoRow(row.video), shared: Boolean(row.shareId) })),
    ...documentRows.map((row) => ({ ...mapDocumentRow(row.document), shared: Boolean(row.shareId) })),
    ...fileRows.map((row) => ({ ...mapFileRow(row.file), shared: Boolean(row.shareId) })),
  ];
  return flattened.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export async function listMediaForAlbum(userId: string, albumId: string): Promise<MediaEntry[]> {
  const all = await listMediaForUser(userId);
  return all
    .filter((item) => item.albumId === albumId)
    .sort((a, b) => (a.albumOrder || 0) - (b.albumOrder || 0) || new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export async function listMediaForAlbumPublic(albumId: string): Promise<MediaEntry[]> {
  const [imageRows, videoRows, documentRows, fileRows] = await Promise.all([
    db.select().from(images).where(eq(images.albumId, albumId)),
    db.select().from(videos).where(eq(videos.albumId, albumId)),
    db.select().from(documents).where(eq(documents.albumId, albumId)),
    db.select().from(files).where(eq(files.albumId, albumId)),
  ]);

  const flattened = [
    ...imageRows.map((row) => mapImageRow(row)),
    ...videoRows.map((row) => mapVideoRow(row)),
    ...documentRows.map((row) => mapDocumentRow(row)),
    ...fileRows.map((row) => mapFileRow(row)),
  ];
  return flattened.sort(
    (a, b) =>
      (a.albumOrder || 0) - (b.albumOrder || 0) ||
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
}

export async function getMediaForUser(
  kind: MediaKind,
  id: string,
  userId: string,
): Promise<MediaEntry | undefined> {
  if (kind === "image") {
    const [row] = await db
      .select()
      .from(images)
      .where(and(eq(images.id, id), eq(images.userId, userId)))
      .limit(1);
    return row ? mapImageRow(row) : undefined;
  }
  if (kind === "video") {
    const [row] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.id, id), eq(videos.userId, userId)))
      .limit(1);
    return row ? mapVideoRow(row) : undefined;
  }
  if (kind === "document") {
    const [row] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .limit(1);
    return row ? mapDocumentRow(row) : undefined;
  }
  const [row] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), eq(files.userId, userId)))
    .limit(1);
  return row ? mapFileRow(row) : undefined;
}

export async function getMedia(kind: MediaKind, id: string): Promise<MediaEntry | undefined> {
  if (kind === "image") {
    const [row] = await db.select().from(images).where(eq(images.id, id)).limit(1);
    return row ? mapImageRow(row) : undefined;
  }
  if (kind === "video") {
    const [row] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return row ? mapVideoRow(row) : undefined;
  }
  if (kind === "document") {
    const [row] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    return row ? mapDocumentRow(row) : undefined;
  }
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return row ? mapFileRow(row) : undefined;
}

export async function getShareForUserByMedia(
  kind: MediaKind,
  mediaId: string,
  userId: string,
): Promise<{ id: string; code?: string | null } | undefined> {
  if (kind === "image") {
    const [row] = await db
      .select({ id: shares.id, code: shares.code })
      .from(shares)
      .where(and(eq(shares.imageId, mediaId), eq(shares.userId, userId)))
      .limit(1);
    return row;
  }
  if (kind === "video") {
    const [row] = await db
      .select({ id: videoShares.id, code: videoShares.code })
      .from(videoShares)
      .where(and(eq(videoShares.videoId, mediaId), eq(videoShares.userId, userId)))
      .limit(1);
    return row;
  }
  if (kind === "document") {
    const [row] = await db
      .select({ id: documentShares.id, code: documentShares.code })
      .from(documentShares)
      .where(and(eq(documentShares.documentId, mediaId), eq(documentShares.userId, userId)))
      .limit(1);
    return row;
  }
  const [row] = await db
    .select({ id: fileShares.id, code: fileShares.code })
    .from(fileShares)
    .where(and(eq(fileShares.fileId, mediaId), eq(fileShares.userId, userId)))
    .limit(1);
  return row;
}

export async function getShareByCode(
  kind: MediaKind,
  code: string,
): Promise<{ id: string; mediaId: string; code?: string | null } | undefined> {
  if (kind === "image") {
    const [row] = await db
      .select({ id: shares.id, mediaId: shares.imageId, code: shares.code })
      .from(shares)
      .where(eq(shares.code, code))
      .limit(1);
    return row;
  }
  if (kind === "video") {
    const [row] = await db
      .select({ id: videoShares.id, mediaId: videoShares.videoId, code: videoShares.code })
      .from(videoShares)
      .where(eq(videoShares.code, code))
      .limit(1);
    return row;
  }
  if (kind === "document") {
    const [row] = await db
      .select({ id: documentShares.id, mediaId: documentShares.documentId, code: documentShares.code })
      .from(documentShares)
      .where(eq(documentShares.code, code))
      .limit(1);
    return row;
  }
  const [row] = await db
    .select({ id: fileShares.id, mediaId: fileShares.fileId, code: fileShares.code })
    .from(fileShares)
    .where(eq(fileShares.code, code))
    .limit(1);
  return row;
}

export async function getSharedMediaByCodeAndExt(code: string, ext: string): Promise<MediaEntry | undefined> {
  const loweredExt = ext.toLowerCase();

  const [imageShare] = await db
    .select({ mediaId: shares.imageId })
    .from(shares)
    .innerJoin(images, eq(images.id, shares.imageId))
    .where(and(eq(shares.code, code), eq(images.ext, loweredExt)))
    .limit(1);
  if (imageShare?.mediaId) {
    return getMedia("image", imageShare.mediaId);
  }

  const [videoShare] = await db
    .select({ mediaId: videoShares.videoId })
    .from(videoShares)
    .innerJoin(videos, eq(videos.id, videoShares.videoId))
    .where(and(eq(videoShares.code, code), eq(videos.ext, loweredExt)))
    .limit(1);
  if (videoShare?.mediaId) {
    return getMedia("video", videoShare.mediaId);
  }

  const [documentShare] = await db
    .select({ mediaId: documentShares.documentId })
    .from(documentShares)
    .innerJoin(documents, eq(documents.id, documentShares.documentId))
    .where(and(eq(documentShares.code, code), eq(documents.ext, loweredExt)))
    .limit(1);
  if (documentShare?.mediaId) {
    return getMedia("document", documentShare.mediaId);
  }

  const [fileShare] = await db
    .select({ mediaId: fileShares.fileId })
    .from(fileShares)
    .innerJoin(files, eq(files.id, fileShares.fileId))
    .where(and(eq(fileShares.code, code), eq(files.ext, loweredExt)))
    .limit(1);
  if (fileShare?.mediaId) {
    return getMedia("other", fileShare.mediaId);
  }

  return undefined;
}

export async function getSharedMediaByCode(code: string): Promise<MediaEntry | undefined> {
  const [imageShare] = await db
    .select({ mediaId: shares.imageId })
    .from(shares)
    .where(eq(shares.code, code))
    .limit(1);
  if (imageShare?.mediaId) {
    return getMedia("image", imageShare.mediaId);
  }

  const [videoShare] = await db
    .select({ mediaId: videoShares.videoId })
    .from(videoShares)
    .where(eq(videoShares.code, code))
    .limit(1);
  if (videoShare?.mediaId) {
    return getMedia("video", videoShare.mediaId);
  }

  const [documentShare] = await db
    .select({ mediaId: documentShares.documentId })
    .from(documentShares)
    .where(eq(documentShares.code, code))
    .limit(1);
  if (documentShare?.mediaId) {
    return getMedia("document", documentShare.mediaId);
  }

  const [fileShare] = await db
    .select({ mediaId: fileShares.fileId })
    .from(fileShares)
    .where(eq(fileShares.code, code))
    .limit(1);
  if (fileShare?.mediaId) {
    return getMedia("other", fileShare.mediaId);
  }

  return undefined;
}

export async function createShareForMedia(
  kind: MediaKind,
  mediaId: string,
  userId: string,
): Promise<{ id: string; code: string } | undefined> {
  const media = await getMediaForUser(kind, mediaId, userId);
  if (!media) {
    return undefined;
  }
  const existing = await getShareForUserByMedia(kind, mediaId, userId);
  if (existing?.code) {
    return { id: existing.id, code: existing.code };
  }
  const code = await generateShareCode(kind);
  if (kind === "image") {
    if (existing) {
      const [row] = await db
        .update(shares)
        .set({ code })
        .where(eq(shares.id, existing.id))
        .returning({ id: shares.id, code: shares.code });
      return row ? { id: row.id, code: row.code ?? code } : undefined;
    }
    const id = randomUUID();
    await db.insert(shares).values({
      id,
      userId,
      imageId: mediaId,
      code,
      createdAt: new Date(),
    });
    return { id, code };
  }
  if (kind === "video") {
    if (existing) {
      const [row] = await db
        .update(videoShares)
        .set({ code })
        .where(eq(videoShares.id, existing.id))
        .returning({ id: videoShares.id, code: videoShares.code });
      return row ? { id: row.id, code: row.code ?? code } : undefined;
    }
    const id = randomUUID();
    await db.insert(videoShares).values({
      id,
      userId,
      videoId: mediaId,
      code,
      createdAt: new Date(),
    });
    return { id, code };
  }
  if (kind === "document") {
    if (existing) {
      const [row] = await db
        .update(documentShares)
        .set({ code })
        .where(eq(documentShares.id, existing.id))
        .returning({ id: documentShares.id, code: documentShares.code });
      return row ? { id: row.id, code: row.code ?? code } : undefined;
    }
    const id = randomUUID();
    await db.insert(documentShares).values({
      id,
      userId,
      documentId: mediaId,
      code,
      createdAt: new Date(),
    });
    return { id, code };
  }
  if (existing) {
    const [row] = await db
      .update(fileShares)
      .set({ code })
      .where(eq(fileShares.id, existing.id))
      .returning({ id: fileShares.id, code: fileShares.code });
    return row ? { id: row.id, code: row.code ?? code } : undefined;
  }
  const id = randomUUID();
  await db.insert(fileShares).values({
    id,
    userId,
    fileId: mediaId,
    code,
    createdAt: new Date(),
  });
  return { id, code };
}

export async function deleteShareForMedia(
  kind: MediaKind,
  mediaId: string,
  userId: string,
): Promise<boolean> {
  if (kind === "image") {
    const rows = await db
      .delete(shares)
      .where(and(eq(shares.userId, userId), eq(shares.imageId, mediaId)))
      .returning({ id: shares.id });
    return rows.length > 0;
  }
  if (kind === "video") {
    const rows = await db
      .delete(videoShares)
      .where(and(eq(videoShares.userId, userId), eq(videoShares.videoId, mediaId)))
      .returning({ id: videoShares.id });
    return rows.length > 0;
  }
  if (kind === "document") {
    const rows = await db
      .delete(documentShares)
      .where(and(eq(documentShares.userId, userId), eq(documentShares.documentId, mediaId)))
      .returning({ id: documentShares.id });
    return rows.length > 0;
  }
  const rows = await db
    .delete(fileShares)
    .where(and(eq(fileShares.userId, userId), eq(fileShares.fileId, mediaId)))
    .returning({ id: fileShares.id });
  return rows.length > 0;
}

export async function getMediaPreviewStatusForUser(
  userId: string,
  kind: MediaKind,
  mediaId: string,
): Promise<{ previewStatus: PreviewStatus; previewError?: string } | undefined> {
  const media = await getMediaForUser(kind, mediaId, userId);
  if (!media) {
    return undefined;
  }
  return {
    previewStatus: media.previewStatus,
    previewError: media.previewError,
  };
}

export async function updateVideoPreviewForUser(input: {
  userId: string;
  mediaId: string;
  previewStatus: PreviewStatus;
  previewError?: string | null;
  sizeSm?: number;
  sizeLg?: number;
  width?: number;
  height?: number;
}): Promise<MediaEntry | undefined> {
  const [row] = await db
    .update(videos)
    .set({
      previewStatus: input.previewStatus,
      previewError: input.previewError ?? null,
      sizeSm: input.sizeSm,
      sizeLg: input.sizeLg,
      width: input.width,
      height: input.height,
    })
    .where(and(eq(videos.userId, input.userId), eq(videos.id, input.mediaId)))
    .returning();

  if (!row) {
    return undefined;
  }
  return mapVideoRow(row);
}

export function sortMediaForAlbum(media: MediaEntry[]): MediaEntry[] {
  return media.sort((a, b) => {
    if ((a.albumOrder ?? 0) !== (b.albumOrder ?? 0)) {
      return (a.albumOrder ?? 0) - (b.albumOrder ?? 0);
    }
    return descDate(a.uploadedAt, b.uploadedAt);
  });
}

function descDate(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

export async function updateMediaAlbum(
  userId: string,
  mediaItems: Array<{ id: string; kind: MediaKind }>,
  albumId: string | null,
): Promise<void> {
  const grouped = {
    image: mediaItems.filter((item) => item.kind === "image").map((item) => item.id),
    video: mediaItems.filter((item) => item.kind === "video").map((item) => item.id),
    document: mediaItems.filter((item) => item.kind === "document").map((item) => item.id),
    other: mediaItems.filter((item) => item.kind === "other").map((item) => item.id),
  };
  if (grouped.image.length > 0) {
    await db
      .update(images)
      .set({ albumId, albumCaption: null })
      .where(and(eq(images.userId, userId), inArray(images.id, grouped.image)));
  }
  if (grouped.video.length > 0) {
    await db
      .update(videos)
      .set({ albumId, albumCaption: null })
      .where(and(eq(videos.userId, userId), inArray(videos.id, grouped.video)));
  }
  if (grouped.document.length > 0) {
    await db
      .update(documents)
      .set({ albumId, albumCaption: null })
      .where(and(eq(documents.userId, userId), inArray(documents.id, grouped.document)));
  }
  if (grouped.other.length > 0) {
    await db
      .update(files)
      .set({ albumId, albumCaption: null })
      .where(and(eq(files.userId, userId), inArray(files.id, grouped.other)));
  }
}

export async function deleteMediaForUser(
  userId: string,
  mediaItems: Array<{ id: string; kind: MediaKind }>,
): Promise<void> {
  for (const item of mediaItems) {
    const media = await getMediaForUser(item.kind, item.id, userId);
    if (!media) {
      continue;
    }
    await deleteShareForMedia(item.kind, item.id, userId);
    if (item.kind === "image") {
      await deleteImageFiles(media.baseName, media.ext, new Date(media.uploadedAt));
      await db.delete(images).where(and(eq(images.userId, userId), eq(images.id, item.id)));
    } else if (item.kind === "video") {
      await db.delete(videos).where(and(eq(videos.userId, userId), eq(videos.id, item.id)));
    } else if (item.kind === "document") {
      await db.delete(documents).where(and(eq(documents.userId, userId), eq(documents.id, item.id)));
    } else {
      await db.delete(files).where(and(eq(files.userId, userId), eq(files.id, item.id)));
    }
  }
}

