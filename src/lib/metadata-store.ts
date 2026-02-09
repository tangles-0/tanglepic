import { randomUUID } from "crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { albumShares, albums, images, shares } from "@/db/schema";

export type Album = {
  id: string;
  name: string;
  createdAt: string;
};

export type ImageEntry = {
  id: string;
  albumId?: string;
  baseName: string;
  width: number;
  height: number;
  uploadedAt: string;
  shared?: boolean;
};

export type ShareLink = {
  id: string;
  imageId: string;
  createdAt: string;
};

export async function listAlbums(userId: string): Promise<Album[]> {
  const rows = await db
    .select()
    .from(albums)
    .where(eq(albums.userId, userId))
    .orderBy(desc(albums.createdAt));
  return rows.map((album) => ({
    id: album.id,
    name: album.name,
    createdAt: album.createdAt.toISOString(),
  }));
}

export async function createAlbum(name: string, userId: string): Promise<Album> {
  const albumId = randomUUID();
  const createdAt = new Date();
  await db.insert(albums).values({
    id: albumId,
    userId,
    name,
    createdAt,
  });

  return { id: albumId, name, createdAt: createdAt.toISOString() };
}

export async function getAlbumForUser(
  albumId: string,
  userId: string,
): Promise<Album | undefined> {
  const [row] = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.userId, userId)))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAlbumPublic(albumId: string): Promise<Album | undefined> {
  const [row] = await db
    .select()
    .from(albums)
    .where(eq(albums.id, albumId))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function addImage(
  entry: Omit<ImageEntry, "id"> & { userId: string },
): Promise<ImageEntry> {
  const imageId = randomUUID();
  const uploadedAt = new Date(entry.uploadedAt);
  await db.insert(images).values({
    id: imageId,
    userId: entry.userId,
    albumId: entry.albumId ?? null,
    baseName: entry.baseName,
    width: entry.width,
    height: entry.height,
    uploadedAt,
  });

  return { ...entry, id: imageId, uploadedAt: uploadedAt.toISOString() };
}

export async function listImagesForUser(userId: string): Promise<ImageEntry[]> {
  const rows = await db
    .select({ image: images, shareId: shares.id })
    .from(images)
    .leftJoin(shares, and(eq(shares.imageId, images.id), eq(shares.userId, userId)))
    .where(eq(images.userId, userId))
    .orderBy(desc(images.uploadedAt));

  return rows.map((row) => ({
    id: row.image.id,
    albumId: row.image.albumId ?? undefined,
    baseName: row.image.baseName,
    width: row.image.width,
    height: row.image.height,
    uploadedAt: row.image.uploadedAt.toISOString(),
    shared: Boolean(row.shareId),
  }));
}

export async function listImagesForAlbum(
  userId: string,
  albumId: string,
): Promise<ImageEntry[]> {
  const rows = await db
    .select({ image: images, shareId: shares.id })
    .from(images)
    .leftJoin(shares, and(eq(shares.imageId, images.id), eq(shares.userId, userId)))
    .where(and(eq(images.userId, userId), eq(images.albumId, albumId)))
    .orderBy(desc(images.uploadedAt));

  return rows.map((row) => ({
    id: row.image.id,
    albumId: row.image.albumId ?? undefined,
    baseName: row.image.baseName,
    width: row.image.width,
    height: row.image.height,
    uploadedAt: row.image.uploadedAt.toISOString(),
    shared: Boolean(row.shareId),
  }));
}

export async function listImagesForAlbumPublic(albumId: string): Promise<ImageEntry[]> {
  const rows = await db
    .select()
    .from(images)
    .where(eq(images.albumId, albumId))
    .orderBy(desc(images.uploadedAt));

  return rows.map((row) => ({
    id: row.id,
    albumId: row.albumId ?? undefined,
    baseName: row.baseName,
    width: row.width,
    height: row.height,
    uploadedAt: row.uploadedAt.toISOString(),
  }));
}

export async function listImagesByIdsForUser(
  userId: string,
  imageIds: string[],
): Promise<ImageEntry[]> {
  if (imageIds.length === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(images)
    .where(and(eq(images.userId, userId), inArray(images.id, imageIds)));

  return rows.map((row) => ({
    id: row.id,
    albumId: row.albumId ?? undefined,
    baseName: row.baseName,
    width: row.width,
    height: row.height,
    uploadedAt: row.uploadedAt.toISOString(),
  }));
}

export async function updateImagesAlbum(
  userId: string,
  imageIds: string[],
  albumId: string | null,
): Promise<void> {
  if (imageIds.length === 0) {
    return;
  }

  await db
    .update(images)
    .set({ albumId })
    .where(and(eq(images.userId, userId), inArray(images.id, imageIds)));
}

export async function deleteImagesForUser(
  userId: string,
  imageIds: string[],
): Promise<ImageEntry[]> {
  if (imageIds.length === 0) {
    return [];
  }

  const rows = await listImagesByIdsForUser(userId, imageIds);
  await db
    .delete(images)
    .where(and(eq(images.userId, userId), inArray(images.id, imageIds)));

  return rows;
}

export async function getImage(imageId: string): Promise<ImageEntry | undefined> {
  const [row] = await db
    .select()
    .from(images)
    .where(eq(images.id, imageId))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    albumId: row.albumId ?? undefined,
    baseName: row.baseName,
    width: row.width,
    height: row.height,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export async function getImageForUser(
  imageId: string,
  userId: string,
): Promise<ImageEntry | undefined> {
  const [row] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, imageId), eq(images.userId, userId)))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    albumId: row.albumId ?? undefined,
    baseName: row.baseName,
    width: row.width,
    height: row.height,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export async function createShare(
  imageId: string,
  userId: string,
): Promise<ShareLink | undefined> {
  const image = await getImageForUser(imageId, userId);
  if (!image) {
    return undefined;
  }

  const [existing] = await db
    .select()
    .from(shares)
    .where(and(eq(shares.imageId, imageId), eq(shares.userId, userId)))
    .limit(1);

  if (existing) {
    return {
      id: existing.id,
      imageId: existing.imageId,
      createdAt: existing.createdAt.toISOString(),
    };
  }

  const shareId = randomUUID();
  const createdAt = new Date();
  await db.insert(shares).values({
    id: shareId,
    userId,
    imageId,
    createdAt,
  });

  return { id: shareId, imageId, createdAt: createdAt.toISOString() };
}

export async function getShareForUserByImage(
  imageId: string,
  userId: string,
): Promise<ShareLink | undefined> {
  const [row] = await db
    .select()
    .from(shares)
    .where(and(eq(shares.imageId, imageId), eq(shares.userId, userId)))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    imageId: row.imageId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function deleteShareForUser(
  imageId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .delete(shares)
    .where(and(eq(shares.imageId, imageId), eq(shares.userId, userId)))
    .returning({ id: shares.id });

  return result.length > 0;
}

export async function deleteSharesForUserByImageIds(
  userId: string,
  imageIds: string[],
): Promise<void> {
  if (imageIds.length === 0) {
    return;
  }

  await db
    .delete(shares)
    .where(and(eq(shares.userId, userId), inArray(shares.imageId, imageIds)));
}

export type AlbumShare = {
  id: string;
  albumId: string;
  createdAt: string;
};

export async function getAlbumShareForUser(
  albumId: string,
  userId: string,
): Promise<AlbumShare | undefined> {
  const [row] = await db
    .select()
    .from(albumShares)
    .where(and(eq(albumShares.albumId, albumId), eq(albumShares.userId, userId)))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    albumId: row.albumId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createAlbumShare(
  albumId: string,
  userId: string,
): Promise<AlbumShare | undefined> {
  const album = await getAlbumForUser(albumId, userId);
  if (!album) {
    return undefined;
  }

  const existing = await getAlbumShareForUser(albumId, userId);
  if (existing) {
    return existing;
  }

  const shareId = randomUUID();
  const createdAt = new Date();
  await db.insert(albumShares).values({
    id: shareId,
    userId,
    albumId,
    createdAt,
  });

  return { id: shareId, albumId, createdAt: createdAt.toISOString() };
}

export async function deleteAlbumShareForUser(
  albumId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .delete(albumShares)
    .where(and(eq(albumShares.albumId, albumId), eq(albumShares.userId, userId)))
    .returning({ id: albumShares.id });

  return result.length > 0;
}

export async function getAlbumShareById(
  shareId: string,
): Promise<AlbumShare | undefined> {
  const [row] = await db
    .select()
    .from(albumShares)
    .where(eq(albumShares.id, shareId))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    albumId: row.albumId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getShare(shareId: string): Promise<ShareLink | undefined> {
  const [row] = await db
    .select()
    .from(shares)
    .where(eq(shares.id, shareId))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    imageId: row.imageId,
    createdAt: row.createdAt.toISOString(),
  };
}

