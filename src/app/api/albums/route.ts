import { NextResponse } from "next/server";
import { createAlbum, listAlbums } from "@/lib/metadata-store";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const albums = await listAlbums(userId);
  return NextResponse.json({ albums });
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as { name?: string };
  const name = payload?.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Album name is required." }, { status: 400 });
  }

  const album = await createAlbum(name, userId);
  return NextResponse.json({ album });
}

