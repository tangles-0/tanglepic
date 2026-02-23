import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getAlbumForUser } from "@/lib/metadata-store";
import { deleteMediaForUser, deleteShareForMedia, updateMediaAlbum, type MediaKind } from "@/lib/media-store";

export const runtime = "nodejs";

type Action = "addToAlbum" | "removeFromAlbum" | "delete" | "disableSharing";

type Payload = {
  action?: Action;
  mediaItems?: Array<{ id: string; kind: MediaKind }>;
  albumId?: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const payload = (await request.json()) as Payload;
  const action = payload.action;
  const mediaItems = payload.mediaItems ?? [];
  if (!action || mediaItems.length === 0) {
    return NextResponse.json({ error: "Action and mediaItems are required." }, { status: 400 });
  }

  if (action === "addToAlbum") {
    const albumId = payload.albumId?.trim();
    if (!albumId) return NextResponse.json({ error: "Album id is required." }, { status: 400 });
    const album = await getAlbumForUser(albumId, userId);
    if (!album) return NextResponse.json({ error: "Album not found." }, { status: 404 });
    await updateMediaAlbum(userId, mediaItems, albumId);
    return NextResponse.json({ ok: true });
  }
  if (action === "removeFromAlbum") {
    await updateMediaAlbum(userId, mediaItems, null);
    return NextResponse.json({ ok: true });
  }
  if (action === "disableSharing") {
    for (const item of mediaItems) {
      await deleteShareForMedia(item.kind, item.id, userId);
    }
    return NextResponse.json({ ok: true });
  }
  if (action === "delete") {
    await deleteMediaForUser(userId, mediaItems);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

