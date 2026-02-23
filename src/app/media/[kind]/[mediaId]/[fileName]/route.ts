import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMediaForUser, type MediaKind } from "@/lib/media-store";
import { contentTypeForExt } from "@/lib/media-types";
import { getMediaBuffer } from "@/lib/media-storage";

export const runtime = "nodejs";

function parseKind(kind: string): MediaKind | null {
  if (kind === "image" || kind === "video" || kind === "document" || kind === "other") {
    return kind;
  }
  return null;
}

function parseFileName(fileName: string): { baseName: string; size: "original" | "sm" | "lg"; ext: string } | null {
  const match = /^(.*?)(-sm|-lg)?\.([a-zA-Z0-9]+)$/.exec(fileName);
  if (!match) {
    return null;
  }
  const suffix = match[2];
  const size = suffix === "-sm" ? "sm" : suffix === "-lg" ? "lg" : "original";
  return { baseName: match[1], size, ext: match[3].toLowerCase() };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ kind: string; mediaId: string; fileName: string }> },
): Promise<Response> {
  const { kind, mediaId, fileName } = await params;
  const parsedKind = parseKind(kind);
  const parsed = parseFileName(fileName);
  if (!parsedKind || !parsed) {
    return new Response("Not found", { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const media = await getMediaForUser(parsedKind, mediaId, userId);
  if (!media) {
    return new Response("Not found", { status: 404 });
  }
  if (parsed.baseName !== media.baseName) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await getMediaBuffer({
      kind: parsedKind,
      baseName: media.baseName,
      ext: media.ext,
      size: parsed.size,
      uploadedAt: new Date(media.uploadedAt),
    });
    const responseExt = parsed.size === "original" ? media.ext : "png";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeForExt(responseExt),
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        Vary: "Cookie, Authorization",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

