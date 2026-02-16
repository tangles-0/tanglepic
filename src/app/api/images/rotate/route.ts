import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getImageForUser, updateImageMetadataForUser } from "@/lib/metadata-store";
import { rotateImageFiles, type RotationDirection } from "@/lib/storage";

export const runtime = "nodejs";

function isSupportedRotationExt(ext: string): boolean {
  const normalized = ext.toLowerCase();
  return normalized === "jpg" || normalized === "jpeg" || normalized === "png";
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    imageId?: string;
    direction?: RotationDirection;
  };
  const imageId = payload?.imageId?.trim();
  const direction = payload?.direction;

  if (!imageId) {
    return NextResponse.json({ error: "Image id is required." }, { status: 400 });
  }

  if (direction !== "left" && direction !== "right") {
    return NextResponse.json({ error: "Direction must be left or right." }, { status: 400 });
  }

  const image = await getImageForUser(imageId, userId);
  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  if (!isSupportedRotationExt(image.ext)) {
    return NextResponse.json(
      { error: "Rotation is only supported for JPG and PNG images." },
      { status: 415 },
    );
  }

  try {
    const rotated = await rotateImageFiles(
      image.baseName,
      image.ext,
      new Date(image.uploadedAt),
      direction,
    );
    const updatedImage = await updateImageMetadataForUser(image.id, userId, rotated);
    if (!updatedImage) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }
    return NextResponse.json({ image: updatedImage });
  } catch {
    return NextResponse.json({ error: "Failed to rotate image." }, { status: 500 });
  }
}


