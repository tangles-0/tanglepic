import { NextResponse } from "next/server";
import { addImage, getAlbumForUser } from "@/lib/metadata-store";
import { storeImageAndThumbnails } from "@/lib/storage";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const albumId = formData.get("albumId")?.toString() || undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }

  if (albumId) {
    const album = await getAlbumForUser(albumId, userId);
    if (!album) {
      return NextResponse.json({ error: "Album not found." }, { status: 404 });
    }
  }

  const uploadedAt = new Date();
  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await storeImageAndThumbnails(buffer, uploadedAt);

  const image = await addImage({
    userId,
    albumId,
    baseName: stored.baseName,
    width: stored.width,
    height: stored.height,
    uploadedAt: uploadedAt.toISOString(),
  });

  return NextResponse.json({ image });
}

