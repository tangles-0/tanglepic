import type { NextRequest } from "next/server";
import { getImageBuffer } from "@/lib/storage";
import { getAlbumShareByCode, getImage, getShareByCode } from "@/lib/metadata-store";
import { unavailableImageResponse } from "@/lib/unavailable-image";

export const runtime = "nodejs";

function parseFileName(fileName: string): {
  code: string;
  size: "original" | "sm" | "lg";
  ext: string;
} | null {
  const match = /^([A-Za-z0-9]+)(-sm|-lg)?\.([a-zA-Z0-9]+)$/.exec(fileName);
  if (!match) {
    return null;
  }
  const suffix = match[2];
  const size = suffix === "-sm" ? "sm" : suffix === "-lg" ? "lg" : "original";
  return { code: match[1], size, ext: match[3].toLowerCase() };
}

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> },
): Promise<Response> {
  const { fileName } = await params;
  const parsed = parseFileName(fileName);
  try {
    if (!parsed && /^[A-Za-z0-9]+$/.test(fileName)) {
      const albumShare = await getAlbumShareByCode(fileName);
      if (albumShare) {
        return new Response(null, {
          status: 307,
          headers: {
            Location: `/share/album/${albumShare.id}`,
          },
        });
      }
      return new Response("Not found", { status: 404 });
    }
    if (!parsed) {
      return unavailableImageResponse("png");
    }

    const share = await getShareByCode(parsed.code);
    if (!share) {
      return unavailableImageResponse(parsed.ext);
    }

    const image = await getImage(share.imageId);
    if (!image || image.ext !== parsed.ext) {
      return unavailableImageResponse(parsed.ext);
    }

    const data = await getImageBuffer(
      image.baseName,
      image.ext,
      parsed.size,
      new Date(image.uploadedAt),
    );
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeForExt(image.ext),
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        Vary: "Cookie, Authorization",
      },
    });
  } catch {
    if (!parsed) {
      return new Response("Service temporarily unavailable.", { status: 503 });
    }
    return unavailableImageResponse(parsed.ext);
  }
}

