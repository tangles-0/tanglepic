import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import {
  deleteImagesForUser,
  deleteSharesForUserByImageIds,
  getAlbumForUser,
  listImagesByIdsForUser,
  updateImagesAlbum,
} from "@/lib/metadata-store";
import { deleteImageFiles } from "@/lib/storage";

export const runtime = "nodejs";

type Action = "addToAlbum" | "removeFromAlbum" | "delete" | "disableSharing";

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    action?: Action;
    imageIds?: string[];
    albumId?: string;
  };

  const action = payload?.action;
  const imageIds = payload?.imageIds ?? [];

  if (!action || imageIds.length === 0) {
    return NextResponse.json(
      { error: "Action and imageIds are required." },
      { status: 400 },
    );
  }

  if (action === "addToAlbum") {
    const albumId = payload.albumId?.trim();
    if (!albumId) {
      return NextResponse.json({ error: "Album id is required." }, { status: 400 });
    }
    const album = await getAlbumForUser(albumId, userId);
    if (!album) {
      return NextResponse.json({ error: "Album not found." }, { status: 404 });
    }
    await updateImagesAlbum(userId, imageIds, albumId);
    return NextResponse.json({ ok: true });
  }

  if (action === "removeFromAlbum") {
    await updateImagesAlbum(userId, imageIds, null);
    return NextResponse.json({ ok: true });
  }

  if (action === "disableSharing") {
    await deleteSharesForUserByImageIds(userId, imageIds);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    await deleteSharesForUserByImageIds(userId, imageIds);
    const images = await deleteImagesForUser(userId, imageIds);
    await Promise.all(
      images.map((image) =>
        deleteImageFiles(image.baseName, image.ext, new Date(image.uploadedAt)),
      ),
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

