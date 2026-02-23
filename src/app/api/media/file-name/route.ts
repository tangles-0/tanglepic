import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { updateOriginalFileNameForUser, type MediaKind } from "@/lib/media-store";

export const runtime = "nodejs";

function isMediaKind(value: string): value is MediaKind {
  return value === "image" || value === "video" || value === "document" || value === "other";
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    kind?: string;
    mediaId?: string;
    originalFileName?: string | null;
  };

  const kind = payload.kind?.trim() ?? "";
  const mediaId = payload.mediaId?.trim() ?? "";
  if (!isMediaKind(kind) || !mediaId) {
    return NextResponse.json({ error: "kind and mediaId are required." }, { status: 400 });
  }

  const normalized =
    typeof payload.originalFileName === "string" ? payload.originalFileName.trim() : "";
  const originalFileName = normalized.length > 0 ? normalized.slice(0, 255) : null;

  const media = await updateOriginalFileNameForUser({
    userId,
    kind,
    mediaId,
    originalFileName,
  });
  if (!media) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  return NextResponse.json({ media });
}
