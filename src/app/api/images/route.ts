import { NextResponse } from "next/server";
import {
  addImage,
  getAlbumForUser,
  getAppSettings,
  getGroupLimits,
  getUserGroupInfo,
  isAdminUser,
} from "@/lib/metadata-store";
import { storeImageAndThumbnails } from "@/lib/storage";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function isAllowedType(allowed: string[], mime: string): boolean {
  if (allowed.length === 0) {
    return true;
  }
  return allowed.some((type) => {
    if (type.endsWith("/*")) {
      return mime.startsWith(type.replace("/*", "/"));
    }
    return mime === type;
  });
}

function checkRateLimit(userId: string, limitPerMinute: number): { allowed: boolean; count: number } {
  if (limitPerMinute <= 0) {
    return { allowed: true, count: 0 };
  }
  const now = Date.now();
  const windowMs = 60_000;
  const entry = rateLimitStore.get(userId);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, count: 1 };
  }
  const nextCount = entry.count + 1;
  entry.count = nextCount;
  return { allowed: nextCount <= limitPerMinute, count: nextCount };
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [groupInfo, isAdmin, settings] = await Promise.all([
    getUserGroupInfo(userId),
    isAdminUser(userId),
    getAppSettings(),
  ]);
  if (!settings.uploadsEnabled) {
    return NextResponse.json({ error: "Uploads are currently disabled." }, { status: 403 });
  }
  const [groupLimits, defaultLimits] = await Promise.all([
    getGroupLimits(groupInfo.groupId),
    getGroupLimits(null),
  ]);

  const formData = await request.formData();
  const file = formData.get("file");
  const albumId = formData.get("albumId")?.toString() || undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }

  if (!isAllowedType(groupLimits.allowedTypes, file.type)) {
    return NextResponse.json({ error: "File type is not allowed." }, { status: 415 });
  }

  if (file.size > groupLimits.maxFileSize) {
    return NextResponse.json({ error: "File exceeds size limit." }, { status: 413 });
  }

  const rateResult = checkRateLimit(userId, groupLimits.rateLimitPerMinute);
  if (!rateResult.allowed && !isAdmin) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  if (isAdmin && defaultLimits.rateLimitPerMinute > 0) {
    const adminRate = checkRateLimit(`admin:${userId}`, defaultLimits.rateLimitPerMinute);
    if (!adminRate.allowed) {
      // eslint-disable-next-line no-console
      console.warn(
        `Admin user ${userId} exceeded default rate limit (${defaultLimits.rateLimitPerMinute}/min).`,
      );
    }
  }

  if (albumId) {
    const album = await getAlbumForUser(albumId, userId);
    if (!album) {
      return NextResponse.json({ error: "Album not found." }, { status: 404 });
    }
  }

  const uploadedAt = new Date();
  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await storeImageAndThumbnails(buffer, uploadedAt);

  const image = await addImage({
    userId,
    albumId,
    baseName: stored.baseName,
    ext: stored.ext,
    width: stored.width,
    height: stored.height,
    sizeOriginal: stored.sizeOriginal,
    sizeSm: stored.sizeSm,
    sizeLg: stored.sizeLg,
    uploadedAt: uploadedAt.toISOString(),
  });

  return NextResponse.json({ image });
}

