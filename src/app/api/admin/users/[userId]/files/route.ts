import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import {
  deleteImagesForUser,
  deleteSharesForUserByImageIds,
  isAdminUser,
  listImagesForUser,
} from "@/lib/metadata-store";
import { deleteImageFiles } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const currentUserId = await getSessionUserId();
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = await isAdminUser(currentUserId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { userId } = await params;
  const images = await listImagesForUser(userId);
  const imageIds = images.map((image) => image.id);

  await deleteSharesForUserByImageIds(userId, imageIds);
  const deleted = await deleteImagesForUser(userId, imageIds);
  await Promise.all(
    deleted.map((image) =>
      deleteImageFiles(image.baseName, image.ext, new Date(image.uploadedAt)),
    ),
  );

  return NextResponse.json({ deleted: imageIds.length });
}

