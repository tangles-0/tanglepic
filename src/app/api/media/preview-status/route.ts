import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getMediaPreviewStatusForUser, type MediaKind } from "@/lib/media-store";

export const runtime = "nodejs";

function parseKind(kind: string | null): MediaKind | null {
  if (kind === "image" || kind === "video" || kind === "document" || kind === "other") {
    return kind;
  }
  return null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const kind = parseKind(url.searchParams.get("kind"));
  const mediaId = url.searchParams.get("mediaId")?.trim() ?? "";
  if (!kind || !mediaId) {
    return NextResponse.json({ error: "kind and mediaId are required." }, { status: 400 });
  }
  const status = await getMediaPreviewStatusForUser(userId, kind, mediaId);
  if (!status) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }
  return NextResponse.json(status);
}

