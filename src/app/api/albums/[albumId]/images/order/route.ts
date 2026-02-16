import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getAlbumForUser, reorderAlbumImagesForUser } from "@/lib/metadata-store";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ albumId: string }> },
): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { albumId } = await params;
  if (!albumId) {
    return NextResponse.json({ error: "Album id is required." }, { status: 400 });
  }

  const album = await getAlbumForUser(albumId, userId);
  if (!album) {
    return NextResponse.json({ error: "Album not found." }, { status: 404 });
  }

  const payload = (await request.json()) as { imageIds?: string[] };
  const imageIds = payload?.imageIds?.filter(Boolean) ?? [];
  if (imageIds.length === 0) {
    return NextResponse.json({ error: "imageIds are required." }, { status: 400 });
  }

  const ok = await reorderAlbumImagesForUser(userId, albumId, imageIds);
  if (!ok) {
    return NextResponse.json(
      { error: "One or more images are not part of this album." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}


