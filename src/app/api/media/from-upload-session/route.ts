import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getAlbumForUser } from "@/lib/metadata-store";
import { addMediaForUser } from "@/lib/media-store";
import { mediaKindFromType } from "@/lib/media-types";
import {
  readCompletedUploadBuffer,
  storeGenericMediaFromStoredUpload,
  storeImageMediaFromBuffer,
} from "@/lib/media-storage";
import { getUploadSessionForUser } from "@/lib/upload-sessions";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const payload = (await request.json()) as {
    sessionId?: string;
    albumId?: string;
    keepOriginalFileName?: boolean;
  };
  const sessionId = payload.sessionId?.trim() ?? "";
  const albumId = payload.albumId?.trim() || undefined;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }
  if (albumId) {
    const album = await getAlbumForUser(albumId, userId);
    if (!album) {
      return NextResponse.json({ error: "Album not found." }, { status: 404 });
    }
  }

  const session = await getUploadSessionForUser(sessionId, userId);
  if (!session) {
    return NextResponse.json({ error: "Upload session not found." }, { status: 404 });
  }
  if (session.state !== "complete" || !session.storageKey) {
    return NextResponse.json({ error: "Upload session is not complete." }, { status: 409 });
  }

  const kind = mediaKindFromType(session.mimeType, session.ext);
  const uploadedAt = new Date();
  let stored;
  if (kind === "image") {
    const buffer = await readCompletedUploadBuffer(session.storageKey);
    stored = await storeImageMediaFromBuffer({
      buffer,
      ext: session.ext,
      mimeType: session.mimeType,
      uploadedAt,
    });
  } else {
    stored = await storeGenericMediaFromStoredUpload({
      kind: kind === "video" ? "video" : kind === "document" ? "document" : "other",
      sourceKey: session.storageKey,
      sizeOriginal: session.fileSize,
      ext: session.ext,
      mimeType: session.mimeType,
      uploadedAt,
      deferPreview: kind === "video",
    });
  }
  const media = await addMediaForUser({
    userId,
    kind,
    albumId,
    baseName: stored.baseName,
    originalFileName: payload.keepOriginalFileName ? session.fileName : undefined,
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

