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

function getInternalAppOrigin(): string {
  const configured = process.env.INTERNAL_APP_ORIGIN?.trim();
  if (configured) {
    return configured;
  }
  return `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> },
): Promise<Response> {
  const { fileName } = await params;
  const parsed = parseFileName(fileName);
  try {
    if (!parsed && /^[A-Za-z0-9]+$/.test(fileName)) {
      const albumShare = await getAlbumShareByCode(fileName);
      if (albumShare) {
        // Proxy internally so `/share/<code>` stays in the browser URL.
        const upstream = await fetch(new URL(`/share/internal-album/${albumShare.id}`, getInternalAppOrigin()), {
          headers: {
            accept: request.headers.get("accept") ?? "text/html,*/*",
          },
          cache: "no-store",
        });
        const headers = new Headers(upstream.headers);
        headers.delete("content-encoding");
        headers.delete("content-length");
        headers.delete("transfer-encoding");
        return new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers,
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

