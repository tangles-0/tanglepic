import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { createShareForMedia, deleteShareForMedia, getMediaForUser, getShareForUserByMedia, type MediaKind } from "@/lib/media-store";

export const runtime = "nodejs";

function parseKind(input: string | null): MediaKind | null {
  if (input === "image" || input === "video" || input === "document" || input === "other") {
    return input;
  }
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const payload = (await request.json()) as { kind?: string; mediaId?: string };
  const kind = parseKind(payload.kind ?? null);
  const mediaId = payload.mediaId?.trim() ?? "";
  if (!kind || !mediaId) {
    return NextResponse.json({ error: "kind and mediaId are required." }, { status: 400 });
  }
  const media = await getMediaForUser(kind, mediaId, userId);
  if (!media) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }
  const share = await createShareForMedia(kind, mediaId, userId);
  if (!share) {
    return NextResponse.json({ error: "Unable to create share." }, { status: 500 });
  }
  const base = `/share/${share.code}.${media.ext}`;
  return NextResponse.json({
    share,
    urls: {
      original: base,
      sm: `/share/${share.code}-sm.${kind === "image" ? media.ext : "png"}`,
      lg: `/share/${share.code}-lg.${kind === "image" ? media.ext : "png"}`,
    },
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const url = new URL(request.url);
  const kind = parseKind(url.searchParams.get("kind"));
  const mediaId = url.searchParams.get("mediaId")?.trim() ?? "";
  if (!kind || !mediaId) {
    return NextResponse.json({ error: "kind and mediaId are required." }, { status: 400 });
  }
  const media = await getMediaForUser(kind, mediaId, userId);
  if (!media) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }
  const share = await getShareForUserByMedia(kind, mediaId, userId);
  if (!share?.code) {
    return NextResponse.json({ share: null });
  }
  const base = `/share/${share.code}.${media.ext}`;
  return NextResponse.json({
    share,
    urls: {
      original: base,
      sm: `/share/${share.code}-sm.${kind === "image" ? media.ext : "png"}`,
      lg: `/share/${share.code}-lg.${kind === "image" ? media.ext : "png"}`,
    },
  });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const payload = (await request.json()) as { kind?: string; mediaId?: string };
  const kind = parseKind(payload.kind ?? null);
  const mediaId = payload.mediaId?.trim() ?? "";
  if (!kind || !mediaId) {
    return NextResponse.json({ error: "kind and mediaId are required." }, { status: 400 });
  }
  const deleted = await deleteShareForMedia(kind, mediaId, userId);
  return NextResponse.json({ deleted });
}

