import { NextResponse } from "next/server";
import {
  createAlbumShare,
  deleteAlbumShareForUser,
  getAlbumForUser,
  getAlbumShareForUser,
} from "@/lib/metadata-store";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const albumId = url.searchParams.get("albumId")?.trim();

  if (!albumId) {
    return NextResponse.json({ error: "Album id is required." }, { status: 400 });
  }

  const album = await getAlbumForUser(albumId, userId);
  if (!album) {
    return NextResponse.json({ error: "Album not found." }, { status: 404 });
  }

  const share = await getAlbumShareForUser(albumId, userId);
  if (!share) {
    return NextResponse.json({ share: null });
  }

  const baseUrl = `/share/album/${share.id}`;
  return NextResponse.json({ share, url: baseUrl });
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as { albumId?: string };
  const albumId = payload?.albumId?.trim();

  if (!albumId) {
    return NextResponse.json({ error: "Album id is required." }, { status: 400 });
  }

  const share = await createAlbumShare(albumId, userId);
  if (!share) {
    return NextResponse.json({ error: "Album not found." }, { status: 404 });
  }

  return NextResponse.json({
    share,
    url: `/share/album/${share.id}`,
  });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as { albumId?: string };
  const albumId = payload?.albumId?.trim();

  if (!albumId) {
    return NextResponse.json({ error: "Album id is required." }, { status: 400 });
  }

  const deleted = await deleteAlbumShareForUser(albumId, userId);
  return NextResponse.json({ deleted });
}

