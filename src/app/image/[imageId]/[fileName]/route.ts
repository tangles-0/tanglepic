import { promises as fs } from "fs";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getImagePath } from "@/lib/storage";
import { getImageForUser } from "@/lib/metadata-store";

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
  { params }: { params: Promise<{ imageId: string; fileName: string }> },
): Promise<Response> {
  const { imageId, fileName } = await params;
  if (!fileName.endsWith(".jpg")) {
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

  const size = resolveSize(fileName);
  const filePath = getImagePath(image.baseName, size, new Date(image.uploadedAt));

  try {
    const data = await fs.readFile(filePath);
    return new Response(data, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

