import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getImageForUser } from "@/lib/metadata-store";
import { hasImageVariant } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const imageId = url.searchParams.get("imageId")?.trim();
  if (!imageId) {
    return NextResponse.json({ error: "Image id is required." }, { status: 400 });
  }

  const image = await getImageForUser(imageId, userId);
  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const exists = await hasImageVariant(
    image.baseName,
    image.ext,
    "x640",
    new Date(image.uploadedAt),
  );

  return NextResponse.json({ exists });
}


