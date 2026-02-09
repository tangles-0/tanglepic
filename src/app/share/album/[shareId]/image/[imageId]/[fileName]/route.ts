import { promises as fs } from "fs";
import type { NextRequest } from "next/server";
import { getAlbumShareById, getImage } from "@/lib/metadata-store";
import { getImagePath } from "@/lib/storage";

export const runtime = "nodejs";

function resolveSize(fileName: string): "original" | "sm" | "lg" {
  if (fileName.endsWith("-sm.jpg")) {
    return "sm";
  }
  if (fileName.endsWith("-lg.jpg")) {
    return "lg";
  }
  return "original";
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ shareId: string; imageId: string; fileName: string }> },
): Promise<Response> {
  const { shareId, imageId, fileName } = await params;
  if (!fileName.endsWith(".jpg")) {
    return new Response("Not found", { status: 404 });
  }

  const share = await getAlbumShareById(shareId);
  if (!share) {
    return new Response("Not found", { status: 404 });
  }

  const image = await getImage(imageId);
  if (!image || image.albumId !== share.albumId) {
    return new Response("Not found", { status: 404 });
  }

  const size = resolveSize(fileName);
  const filePath = getImagePath(image.baseName, size, new Date(image.uploadedAt));

  try {
    const data = await fs.readFile(filePath);
    return new Response(data, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

