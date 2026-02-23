import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getAlbumForUser } from "@/lib/metadata-store";
import { addMediaForUser } from "@/lib/media-store";
import { mediaKindFromType } from "@/lib/media-types";
import { readCompletedUploadBuffer, storeGenericMediaFromBuffer, storeImageMediaFromBuffer } from "@/lib/media-storage";
import { getUploadSessionForUser } from "@/lib/upload-sessions";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const payload = (await request.json()) as { sessionId?: string; albumId?: string };
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

  const buffer = await readCompletedUploadBuffer(session.storageKey);
  const kind = mediaKindFromType(session.mimeType, session.ext);
  const uploadedAt = new Date();
  const stored =
    kind === "image"
      ? await storeImageMediaFromBuffer({
          buffer,
          ext: session.ext,
          mimeType: session.mimeType,
          uploadedAt,
        })
      : await storeGenericMediaFromBuffer({
          kind: kind === "video" ? "video" : kind === "document" ? "document" : "other",
          buffer,
          ext: session.ext,
          mimeType: session.mimeType,
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
  return NextResponse.json({ media });
}

