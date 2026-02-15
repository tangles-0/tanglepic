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
  size: "original" | "sm" | "lg";
  ext: string;
} | null {
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
      headers: {
        "Content-Type": contentTypeForExt(image.ext),
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        Vary: "Cookie, Authorization",
      },
    });
  } catch {
    return unavailableImageResponse(parsed?.ext ?? "png");
  }
}

