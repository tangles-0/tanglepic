import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import {
  getAlbumForUser,
  getAppSettings,
  getGroupLimits,
  getMaxAllowedBytesForKind,
  getUserGroupInfo,
  isAdminUser,
} from "@/lib/metadata-store";
import { addMediaForUser } from "@/lib/media-store";
import { extFromFileName, mediaKindFromType } from "@/lib/media-types";
import { storeGenericMediaFromBuffer, storeImageMediaFromBuffer } from "@/lib/media-storage";

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
  const albumId = formData.get("albumId")?.toString().trim() || undefined;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }
  if (!file.type) {
    return NextResponse.json({ error: "File type is required." }, { status: 400 });
  }
  const ext = extFromFileName(file.name);
  if (!ext) {
    return NextResponse.json({ error: "File extension is required." }, { status: 400 });
  }
  const kind = mediaKindFromType(file.type, ext);
  if (!isAllowedType(groupLimits.allowedTypes, file.type)) {
    return NextResponse.json({ error: "File type is not allowed." }, { status: 415 });
  }
  const maxAllowedBytes = getMaxAllowedBytesForKind(groupLimits, kind);
  if (file.size > maxAllowedBytes) {
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
      console.warn(`Admin user ${userId} exceeded default rate limit.`);
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

  const stored =
    kind === "image"
      ? await storeImageMediaFromBuffer({
          buffer,
          ext,
          mimeType: file.type,
          uploadedAt,
        })
      : await storeGenericMediaFromBuffer({
          kind: kind === "video" ? "video" : kind === "document" ? "document" : "other",
          buffer,
          ext,
          mimeType: file.type,
          uploadedAt,
          deferPreview: kind === "video",
        });

  const media = await addMediaForUser({
    userId,
    kind,
    albumId,
    baseName: stored.baseName,
    ext: stored.ext,
    mimeType: stored.mimeType,
    width: stored.width,
    height: stored.height,
    sizeOriginal: stored.sizeOriginal,
    sizeSm: stored.sizeSm,
    sizeLg: stored.sizeLg,
    previewStatus: stored.previewStatus,
    uploadedAt: uploadedAt.toISOString(),
  });

  if (media.kind === "video" && media.previewStatus === "pending") {
    const triggerUrl = new URL("/api/media/video-preview", request.url);
    const cookie = request.headers.get("cookie");
    void fetch(triggerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({ mediaId: media.id }),
      cache: "no-store",
    }).catch(() => {
      // Best-effort background kickoff; polling will keep UI accurate.
    });
  }

  return NextResponse.json({ media });
}

