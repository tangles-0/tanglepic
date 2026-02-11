import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { deleteAlbumForUser } from "@/lib/metadata-store";

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

