import type { NextRequest } from "next/server";
import { getImageBuffer } from "@/lib/storage";
import { getImage, getShareByCode } from "@/lib/metadata-store";

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
  if (!parsed) {
    return new Response("Not found", { status: 404 });
  }

  const share = await getShareByCode(parsed.code);
  if (!share) {
    return new Response("Not found", { status: 404 });
  }

  const image = await getImage(share.imageId);
  if (!image || image.ext !== parsed.ext) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await getImageBuffer(
      image.baseName,
      image.ext,
      parsed.size,
      new Date(image.uploadedAt),
    );
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeForExt(image.ext),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

