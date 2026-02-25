import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { addImage, getImageForUser, updateImageMetadataForUser } from "@/lib/metadata-store";
import {
  hasImageVariant,
  overwriteImageAndThumbnails,
  storeImageAndThumbnails,
} from "@/lib/storage";

export const runtime = "nodejs";

type SaveMode = "update" | "copy";

const COPY_VISIBILITY_TIMEOUT_MS = 4000;
const COPY_VISIBILITY_POLL_MS = 100;

function parseMode(value: FormDataEntryValue | null): SaveMode | null {
  if (value === "update" || value === "copy") {
    return value;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForStoredImageCopy(input: {
  baseName: string;
  ext: string;
  uploadedAt: Date;
}): Promise<void> {
  const deadline = Date.now() + COPY_VISIBILITY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const [hasOriginal, hasSm] = await Promise.all([
      hasImageVariant(input.baseName, input.ext, "original", input.uploadedAt),
      hasImageVariant(input.baseName, input.ext, "sm", input.uploadedAt),
    ]);
    if (hasOriginal && hasSm) {
      return;
    }
    await sleep(COPY_VISIBILITY_POLL_MS);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const mode = parseMode(formData.get("mode"));
  const imageIdValue = formData.get("imageId");
  const fileEntry = formData.get("file");
  const imageId = typeof imageIdValue === "string" ? imageIdValue.trim() : "";

  if (!mode || !imageId) {
    return NextResponse.json({ error: "Mode and image id are required." }, { status: 400 });
  }
  if (!(fileEntry instanceof File) || !fileEntry.type.startsWith("image/")) {
    return NextResponse.json({ error: "A valid image file is required." }, { status: 400 });
  }

  const sourceImage = await getImageForUser(imageId, userId);
  if (!sourceImage) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());

  try {
    if (mode === "update") {
      const updatedDimensions = await overwriteImageAndThumbnails(
        buffer,
        sourceImage.baseName,
        sourceImage.ext,
        new Date(sourceImage.uploadedAt),
      );
      const updatedImage = await updateImageMetadataForUser(sourceImage.id, userId, updatedDimensions);
      if (!updatedImage) {
        return NextResponse.json({ error: "Image not found." }, { status: 404 });
      }
      return NextResponse.json({ image: { ...updatedImage, kind: "image" as const } });
    }

    const uploadedAt = new Date();
    const stored = await storeImageAndThumbnails(buffer, uploadedAt);
    await waitForStoredImageCopy({
      baseName: stored.baseName,
      ext: stored.ext,
      uploadedAt,
    });
    const copiedImage = await addImage({
      userId,
      albumId: sourceImage.albumId,
      albumCaption: sourceImage.albumCaption,
      baseName: stored.baseName,
      ext: stored.ext,
      width: stored.width,
      height: stored.height,
      sizeOriginal: stored.sizeOriginal,
      sizeSm: stored.sizeSm,
      sizeLg: stored.sizeLg,
      uploadedAt: uploadedAt.toISOString(),
    });
    return NextResponse.json({ image: { ...copiedImage, kind: "image" as const } });
  } catch {
    return NextResponse.json({ error: "Failed to save dithered image." }, { status: 500 });
  }
}


