import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getImageBuffer } from "@/lib/storage";
import { getImageForUser } from "@/lib/metadata-store";

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
  { params }: { params: Promise<{ imageId: string; fileName: string }> },
): Promise<Response> {
  const { imageId, fileName } = await params;
  const parsed = parseFileName(fileName);
  if (!parsed) {
    return new Response("Not found", { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const image = await getImageForUser(imageId, userId);
  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  if (parsed.baseName !== image.baseName || parsed.ext !== image.ext) {
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

