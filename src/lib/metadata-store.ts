import { randomUUID, randomBytes } from "crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  albumShares,
  albums,
  appSettings,
  groupLimits,
  groups,
  images,
  shares,
  users,
} from "@/db/schema";

export type Album = {
  id: string;
  name: string;
  createdAt: string;
};

export type ImageEntry = {
  id: string;
  albumId?: string;
  baseName: string;
  ext: string;
  width: number;
  height: number;
  sizeOriginal: number;
  sizeSm: number;
  sizeLg: number;
  uploadedAt: string;
  shared?: boolean;
};

export type ShareLink = {
  id: string;
  imageId: string;
  createdAt: string;
  code?: string | null;
};

const SHARE_CODE_LENGTH = 8;

async function generateShareCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const raw = randomBytes(6);
    const code = raw
      .toString("base64url")
      .replace(/[-_]/g, "0")
      .slice(0, SHARE_CODE_LENGTH);
    const [existing] = await db
      .select({ id: shares.id })
      .from(shares)
      .where(eq(shares.code, code))
      .limit(1);
    if (!existing) {
      return code;
    }
  }
  return randomUUID().replace(/-/g, "").slice(0, SHARE_CODE_LENGTH);
}

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

export async function deleteAlbumForUser(
  albumId: string,
  userId: string,
): Promise<boolean> {
  const album = await getAlbumForUser(albumId, userId);
  if (!album) {
    return false;
  }

  await db
    .update(images)
    .set({ albumId: null })
    .where(and(eq(images.userId, userId), eq(images.albumId, albumId)));

  await db
    .delete(albumShares)
    .where(and(eq(albumShares.albumId, albumId), eq(albumShares.userId, userId)));

  const result = await db
    .delete(albums)
    .where(and(eq(albums.id, albumId), eq(albums.userId, userId)))
    .returning({ id: albums.id });

  return result.length > 0;
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
    ext: entry.ext,
    width: entry.width,
    height: entry.height,
    sizeOriginal: entry.sizeOriginal,
    sizeSm: entry.sizeSm,
    sizeLg: entry.sizeLg,
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
    ext: row.image.ext,
    width: row.image.width,
    height: row.image.height,
    sizeOriginal: row.image.sizeOriginal,
    sizeSm: row.image.sizeSm,
    sizeLg: row.image.sizeLg,
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
    ext: row.image.ext,
    width: row.image.width,
    height: row.image.height,
    sizeOriginal: row.image.sizeOriginal,
    sizeSm: row.image.sizeSm,
    sizeLg: row.image.sizeLg,
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
    ext: row.ext,
    width: row.width,
    height: row.height,
    sizeOriginal: row.sizeOriginal,
    sizeSm: row.sizeSm,
    sizeLg: row.sizeLg,
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
    ext: row.ext,
    width: row.width,
    height: row.height,
    sizeOriginal: row.sizeOriginal,
    sizeSm: row.sizeSm,
    sizeLg: row.sizeLg,
    uploadedAt: row.uploadedAt.toISOString(),
  }));
}

export async function getUserUploadStats(userId: string): Promise<{
  imageCount: number;
  totalBytes: number;
}> {
  const [row] = await db
    .select({
      totalBytes: sql<number>`coalesce(sum(${images.sizeOriginal} + ${images.sizeSm} + ${images.sizeLg}), 0)`,
      imageCount: sql<number>`count(${images.id})`,
    })
    .from(images)
    .where(eq(images.userId, userId));

  return {
    imageCount: Number(row?.imageCount ?? 0),
    totalBytes: Number(row?.totalBytes ?? 0),
  };
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
    ext: row.ext,
    width: row.width,
    height: row.height,
    sizeOriginal: row.sizeOriginal,
    sizeSm: row.sizeSm,
    sizeLg: row.sizeLg,
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
    ext: row.ext,
    width: row.width,
    height: row.height,
    sizeOriginal: row.sizeOriginal,
    sizeSm: row.sizeSm,
    sizeLg: row.sizeLg,
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
    if (!existing.code) {
      const code = await generateShareCode();
      const [row] = await db
        .update(shares)
        .set({ code })
        .where(eq(shares.id, existing.id))
        .returning();
      return {
        id: row.id,
        imageId: row.imageId,
        createdAt: row.createdAt.toISOString(),
        code: row.code,
      };
    }
    return {
      id: existing.id,
      imageId: existing.imageId,
      createdAt: existing.createdAt.toISOString(),
      code: existing.code,
    };
  }

  const shareId = randomUUID();
  const createdAt = new Date();
  const code = await generateShareCode();
  await db.insert(shares).values({
    id: shareId,
    userId,
    imageId,
    code,
    createdAt,
  });

  return { id: shareId, imageId, createdAt: createdAt.toISOString(), code };
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
    code: row.code,
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
  code?: string | null;
  createdAt: string;
};

async function generateAlbumShareCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const raw = randomBytes(6);
    const code = raw
      .toString("base64url")
      .replace(/[-_]/g, "0")
      .slice(0, SHARE_CODE_LENGTH);
    const [existing] = await db
      .select({ id: albumShares.id })
      .from(albumShares)
      .where(eq(albumShares.code, code))
      .limit(1);
    if (!existing) {
      return code;
    }
  }
  return randomUUID().replace(/-/g, "").slice(0, SHARE_CODE_LENGTH);
}

async function ensureAlbumShareCode(shareId: string): Promise<string> {
  const code = await generateAlbumShareCode();
  const [updated] = await db
    .update(albumShares)
    .set({ code })
    .where(and(eq(albumShares.id, shareId), sql`${albumShares.code} is null`))
    .returning({ code: albumShares.code });
  return updated?.code ?? code;
}

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

  const code = row.code ?? (await ensureAlbumShareCode(row.id));
  return {
    id: row.id,
    albumId: row.albumId,
    code,
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
  const code = await generateAlbumShareCode();
  const createdAt = new Date();
  await db.insert(albumShares).values({
    id: shareId,
    userId,
    albumId,
    code,
    createdAt,
  });

  return { id: shareId, albumId, code, createdAt: createdAt.toISOString() };
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

  const code = row.code ?? (await ensureAlbumShareCode(row.id));
  return {
    id: row.id,
    albumId: row.albumId,
    code,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAlbumShareByCode(code: string): Promise<AlbumShare | undefined> {
  const [row] = await db
    .select()
    .from(albumShares)
    .where(eq(albumShares.code, code))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    albumId: row.albumId,
    code: row.code,
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
    code: row.code,
  };
}

export async function getShareByCode(code: string): Promise<ShareLink | undefined> {
  const [row] = await db
    .select()
    .from(shares)
    .where(eq(shares.code, code))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    imageId: row.imageId,
    createdAt: row.createdAt.toISOString(),
    code: row.code,
  };
}

export type UserStats = {
  id: string;
  username: string;
  email: string;
  groupId?: string;
  groupName?: string;
  imageCount: number;
  totalBytes: number;
  averageBytes: number;
  lastUploadAt?: string;
  lastLoginAt?: string;
};

export async function listUsersWithStats(): Promise<UserStats[]> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      groupId: users.groupId,
      groupName: groups.name,
      lastLoginAt: users.lastLoginAt,
      imageCount: sql<number>`count(${images.id})`,
      totalBytes: sql<number>`coalesce(sum(${images.sizeOriginal} + ${images.sizeSm} + ${images.sizeLg}), 0)`,
      lastUploadAt: sql<Date | null>`max(${images.uploadedAt})`,
    })
    .from(users)
    .leftJoin(groups, eq(users.groupId, groups.id))
    .leftJoin(images, eq(images.userId, users.id))
    .groupBy(users.id, groups.name, users.lastLoginAt)
    .orderBy(users.email);

  return rows.map((row) => {
    const imageCount = Number(row.imageCount ?? 0);
    const totalBytes = Number(row.totalBytes ?? 0);
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      groupId: row.groupId ?? undefined,
      groupName: row.groupName ?? undefined,
      imageCount,
      totalBytes,
      averageBytes: imageCount > 0 ? Math.round(totalBytes / imageCount) : 0,
      lastUploadAt: row.lastUploadAt
        ? new Date(row.lastUploadAt).toISOString()
        : undefined,
      lastLoginAt: row.lastLoginAt
        ? new Date(row.lastLoginAt).toISOString()
        : undefined,
    };
  });
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .leftJoin(groups, eq(users.groupId, groups.id))
    .where(and(eq(users.id, userId), eq(groups.name, "admin")))
    .limit(1);
  return Boolean(row);
}

export async function countAdminUsers(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(${users.id})` })
    .from(users)
    .leftJoin(groups, eq(users.groupId, groups.id))
    .where(eq(groups.name, "admin"));

  return Number(row?.count ?? 0);
}

export async function ensureAdminGroup(): Promise<string> {
  const [existing] = await db
    .select()
    .from(groups)
    .where(eq(groups.name, "admin"))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const groupId = randomUUID();
  await db.insert(groups).values({
    id: groupId,
    name: "admin",
    createdAt: new Date(),
  });

  return groupId;
}

export async function promoteUserToAdmin(userId: string): Promise<boolean> {
  const adminGroupId = await ensureAdminGroup();
  const result = await db
    .update(users)
    .set({ groupId: adminGroupId })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return result.length > 0;
}

export async function deleteUser(userId: string): Promise<void> {
  await db.delete(albumShares).where(eq(albumShares.userId, userId));
  await db.delete(shares).where(eq(shares.userId, userId));
  await db.delete(images).where(eq(images.userId, userId));
  await db.delete(albums).where(eq(albums.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

export type GroupSummary = {
  id: string;
  name: string;
  userCount: number;
};

export async function listGroupsWithCounts(): Promise<GroupSummary[]> {
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      userCount: sql<number>`count(${users.id})`,
    })
    .from(groups)
    .leftJoin(users, eq(users.groupId, groups.id))
    .groupBy(groups.id)
    .orderBy(groups.name);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    userCount: Number(row.userCount ?? 0),
  }));
}

export async function createGroup(name: string): Promise<GroupSummary> {
  const groupId = randomUUID();
  await db.insert(groups).values({
    id: groupId,
    name,
    createdAt: new Date(),
  });

  return { id: groupId, name, userCount: 0 };
}

export async function deleteGroup(groupId: string): Promise<void> {
  await db.update(users).set({ groupId: null }).where(eq(users.groupId, groupId));
  await db.delete(groupLimits).where(eq(groupLimits.groupId, groupId));
  await db.delete(groups).where(eq(groups.id, groupId));
}

export async function setUserGroup(userId: string, groupId: string | null): Promise<void> {
  await db.update(users).set({ groupId }).where(eq(users.id, userId));
}

export async function getUserGroupInfo(userId: string): Promise<{
  groupId: string | null;
  groupName?: string;
}> {
  const [row] = await db
    .select({ groupId: users.groupId, groupName: groups.name })
    .from(users)
    .leftJoin(groups, eq(users.groupId, groups.id))
    .where(eq(users.id, userId))
    .limit(1);

  return {
    groupId: row?.groupId ?? null,
    groupName: row?.groupName ?? undefined,
  };
}

export async function getUserTheme(userId: string): Promise<string> {
  const [row] = await db
    .select({ theme: users.theme })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.theme ?? "default";
}

export async function setUserTheme(userId: string, theme: string): Promise<void> {
  await db.update(users).set({ theme }).where(eq(users.id, userId));
}

export type GroupLimits = {
  id: string;
  groupId: string | null;
  maxFileSize: number;
  allowedTypes: string[];
  rateLimitPerMinute: number;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_LIMITS: Omit<GroupLimits, "id" | "groupId" | "createdAt" | "updatedAt"> = {
  maxFileSize: 10 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  rateLimitPerMinute: 30,
};

function mapLimits(row: typeof groupLimits.$inferSelect): GroupLimits {
  return {
    id: row.id,
    groupId: row.groupId ?? null,
    maxFileSize: row.maxFileSize,
    allowedTypes: row.allowedTypes.split(",").map((item) => item.trim()).filter(Boolean),
    rateLimitPerMinute: row.rateLimitPerMinute,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getGroupLimits(groupId: string | null): Promise<GroupLimits> {
  const [row] = await db
    .select()
    .from(groupLimits)
    .where(groupId ? eq(groupLimits.groupId, groupId) : sql`${groupLimits.groupId} is null`)
    .limit(1);

  if (row) {
    return mapLimits(row);
  }

  const createdAt = new Date();
  const limitId = randomUUID();
  await db.insert(groupLimits).values({
    id: limitId,
    groupId,
    maxFileSize: DEFAULT_LIMITS.maxFileSize,
    allowedTypes: DEFAULT_LIMITS.allowedTypes.join(","),
    rateLimitPerMinute: DEFAULT_LIMITS.rateLimitPerMinute,
    createdAt,
    updatedAt: createdAt,
  });

  return {
    id: limitId,
    groupId,
    ...DEFAULT_LIMITS,
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
  };
}

export async function upsertGroupLimits(input: {
  groupId: string | null;
  maxFileSize: number;
  allowedTypes: string[];
  rateLimitPerMinute: number;
}): Promise<GroupLimits> {
  const [existing] = await db
    .select()
    .from(groupLimits)
    .where(input.groupId ? eq(groupLimits.groupId, input.groupId) : sql`${groupLimits.groupId} is null`)
    .limit(1);

  const updatedAt = new Date();
  if (existing) {
    const [row] = await db
      .update(groupLimits)
      .set({
        maxFileSize: input.maxFileSize,
        allowedTypes: input.allowedTypes.join(","),
        rateLimitPerMinute: input.rateLimitPerMinute,
        updatedAt,
      })
      .where(eq(groupLimits.id, existing.id))
      .returning();

    return mapLimits(row);
  }

  const createdAt = updatedAt;
  const limitId = randomUUID();
  await db.insert(groupLimits).values({
    id: limitId,
    groupId: input.groupId,
    maxFileSize: input.maxFileSize,
    allowedTypes: input.allowedTypes.join(","),
    rateLimitPerMinute: input.rateLimitPerMinute,
    createdAt,
    updatedAt,
  });

  return {
    id: limitId,
    groupId: input.groupId,
    maxFileSize: input.maxFileSize,
    allowedTypes: input.allowedTypes,
    rateLimitPerMinute: input.rateLimitPerMinute,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export async function getAdminStats(): Promise<{
  totalBytes: number;
  imageCount: number;
  userCount: number;
  uploadsLast24h: number;
  signupsLast24h: number;
  signupsLast30d: number;
  sharedPercent: number;
  averageFileSize: number;
  albumCount: number;
  filetypeBreakdown: { ext: string; count: number }[];
}> {
  const [row] = await db
    .select({
      totalBytes: sql<number>`coalesce(sum(${images.sizeOriginal} + ${images.sizeSm} + ${images.sizeLg}), 0)`,
      imageCount: sql<number>`count(${images.id})`,
    })
    .from(images);

  const [userRow] = await db
    .select({ userCount: sql<number>`count(${users.id})` })
    .from(users);

  const [uploadsRow] = await db
    .select({
      uploadsLast24h: sql<number>`count(${images.id})`,
    })
    .from(images)
    .where(sql`${images.uploadedAt} >= now() - interval '24 hours'`);

  const [signup24hRow] = await db
    .select({ signupsLast24h: sql<number>`count(${users.id})` })
    .from(users)
    .where(sql`${users.createdAt} >= now() - interval '24 hours'`);

  const [signup30dRow] = await db
    .select({ signupsLast30d: sql<number>`count(${users.id})` })
    .from(users)
    .where(sql`${users.createdAt} >= now() - interval '30 days'`);

  const [sharedRow] = await db
    .select({ sharedCount: sql<number>`count(distinct ${shares.imageId})` })
    .from(shares);

  const [albumRow] = await db
    .select({ albumCount: sql<number>`count(${albums.id})` })
    .from(albums);

  const filetypeRows = await db
    .select({ ext: images.ext, count: sql<number>`count(${images.id})` })
    .from(images)
    .groupBy(images.ext)
    .orderBy(sql`count(${images.id}) desc`);

  const imageCount = Number(row?.imageCount ?? 0);
  const totalBytes = Number(row?.totalBytes ?? 0);
  const sharedCount = Number(sharedRow?.sharedCount ?? 0);

  return {
    totalBytes,
    imageCount,
    userCount: Number(userRow?.userCount ?? 0),
    uploadsLast24h: Number(uploadsRow?.uploadsLast24h ?? 0),
    signupsLast24h: Number(signup24hRow?.signupsLast24h ?? 0),
    signupsLast30d: Number(signup30dRow?.signupsLast30d ?? 0),
    sharedPercent: imageCount > 0 ? Math.round((sharedCount / imageCount) * 100) : 0,
    averageFileSize: imageCount > 0 ? Math.round(totalBytes / imageCount) : 0,
    albumCount: Number(albumRow?.albumCount ?? 0),
    filetypeBreakdown: filetypeRows.map((rowItem) => ({
      ext: rowItem.ext ?? "unknown",
      count: Number(rowItem.count ?? 0),
    })),
  };
}

export type AppSettings = {
  motd: string;
  costThisMonth: number;
  fundedThisMonth: number;
  donateUrl?: string;
  supportEnabled: boolean;
  signupsEnabled: boolean;
  uploadsEnabled: boolean;
  updatedAt: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  motd: "Welcome to LaTeX.",
  costThisMonth: 0,
  fundedThisMonth: 0,
  donateUrl: undefined,
  supportEnabled: true,
  signupsEnabled: true,
  uploadsEnabled: true,
  updatedAt: new Date(0).toISOString(),
};

export async function getAppSettings(): Promise<AppSettings> {
  const [row] = await db.select().from(appSettings).limit(1);
  if (!row) {
    const now = new Date();
    await db.insert(appSettings).values({
      id: "global",
      motd: DEFAULT_SETTINGS.motd,
      costThisMonth: DEFAULT_SETTINGS.costThisMonth,
      fundedThisMonth: DEFAULT_SETTINGS.fundedThisMonth,
      donateUrl: DEFAULT_SETTINGS.donateUrl ?? null,
      supportEnabled: DEFAULT_SETTINGS.supportEnabled,
      signupsEnabled: DEFAULT_SETTINGS.signupsEnabled,
      uploadsEnabled: DEFAULT_SETTINGS.uploadsEnabled,
      updatedAt: now,
    });
    return { ...DEFAULT_SETTINGS, updatedAt: now.toISOString() };
  }
  return {
    motd: row.motd,
    costThisMonth: row.costThisMonth,
    fundedThisMonth: row.fundedThisMonth,
    donateUrl: row.donateUrl ?? undefined,
    supportEnabled: row.supportEnabled,
    signupsEnabled: row.signupsEnabled,
    uploadsEnabled: row.uploadsEnabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateAppSettings(input: {
  motd?: string;
  costThisMonth?: number;
  fundedThisMonth?: number;
  donateUrl?: string | null;
  supportEnabled?: boolean;
  signupsEnabled?: boolean;
  uploadsEnabled?: boolean;
}): Promise<AppSettings> {
  const existing = await getAppSettings();
  const updatedAt = new Date();
  const [row] = await db
    .update(appSettings)
    .set({
      motd: input.motd ?? existing.motd,
      costThisMonth:
        typeof input.costThisMonth === "number"
          ? input.costThisMonth
          : existing.costThisMonth,
      fundedThisMonth:
        typeof input.fundedThisMonth === "number"
          ? input.fundedThisMonth
          : existing.fundedThisMonth,
      donateUrl: input.donateUrl ?? existing.donateUrl ?? null,
      supportEnabled:
        typeof input.supportEnabled === "boolean"
          ? input.supportEnabled
          : existing.supportEnabled,
      signupsEnabled:
        typeof input.signupsEnabled === "boolean"
          ? input.signupsEnabled
          : existing.signupsEnabled,
      uploadsEnabled:
        typeof input.uploadsEnabled === "boolean"
          ? input.uploadsEnabled
          : existing.uploadsEnabled,
      updatedAt,
    })
    .where(eq(appSettings.id, "global"))
    .returning();

  return {
    motd: row.motd,
    costThisMonth: row.costThisMonth,
    fundedThisMonth: row.fundedThisMonth,
    donateUrl: row.donateUrl ?? undefined,
    supportEnabled: row.supportEnabled,
    signupsEnabled: row.signupsEnabled,
    uploadsEnabled: row.uploadsEnabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

