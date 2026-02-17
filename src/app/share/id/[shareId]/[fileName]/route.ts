import type { NextRequest } from "next/server";
import { getImageBuffer } from "@/lib/storage";
import { getImage, getShare } from "@/lib/metadata-store";
import { unavailableImageResponse } from "@/lib/unavailable-image";

export const runtime = "nodejs";

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

function parseFileName(fileName: string): {
  baseName: string;
  size: "original" | "sm" | "lg" | "x640";
  ext: string;
} | null {
  const match = /^(.*?)(-sm|-lg|-640)?\.([a-zA-Z0-9]+)$/.exec(fileName);
  if (!match) {
    return null;
  }
  const suffix = match[2];
  const size =
    suffix === "-sm" ? "sm" : suffix === "-lg" ? "lg" : suffix === "-640" ? "x640" : "original";
  return { baseName: match[1], size, ext: match[3].toLowerCase() };
}

function publicCacheHeaders(ext: string): Headers {
  return new Headers({
    "Content-Type": contentTypeForExt(ext),
    "Cache-Control": "public, max-age=31536000, immutable",
    Vary: "Accept-Encoding",
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareId: string; fileName: string }> },
): Promise<Response> {
  const { shareId, fileName } = await params;

  const parsed = parseFileName(fileName);
  try {
    if (!parsed) {
      return unavailableImageResponse("png");
    }

    const share = await getShare(shareId);
    if (!share) {
      return unavailableImageResponse(parsed.ext);
    }

    const image = await getImage(share.imageId);
    if (!image) {
      return unavailableImageResponse(parsed.ext);
    }

    if (parsed.baseName !== image.baseName || parsed.ext !== image.ext) {
      return unavailableImageResponse(parsed.ext);
    }

    const data = await getImageBuffer(
      image.baseName,
      image.ext,
      parsed.size,
      new Date(image.uploadedAt),
    );
    return new Response(new Uint8Array(data), {
      headers: publicCacheHeaders(image.ext),
    });
  } catch {
    return unavailableImageResponse(parsed?.ext ?? "png");
  }
}

