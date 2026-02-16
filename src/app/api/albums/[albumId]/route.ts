import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { deleteAlbumForUser, renameAlbumForUser } from "@/lib/metadata-store";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
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

  const deleted = await deleteAlbumForUser(albumId, userId);
  if (!deleted) {
    return NextResponse.json({ error: "Album not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

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

  const payload = (await request.json()) as { name?: string };
  const name = payload?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Album name is required." }, { status: 400 });
  }

  const album = await renameAlbumForUser(albumId, userId, name);
  if (!album) {
    return NextResponse.json({ error: "Album not found." }, { status: 404 });
  }

  return NextResponse.json({ album });
}

