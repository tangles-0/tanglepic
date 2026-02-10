import { NextResponse } from "next/server";
import {
  createShare,
  deleteShareForUser,
  getImageForUser,
  getShareForUserByImage,
} from "@/lib/metadata-store";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as { imageId?: string };
  const imageId = payload?.imageId?.trim();

  if (!imageId) {
    return NextResponse.json({ error: "Image id is required." }, { status: 400 });
  }

  const image = await getImageForUser(imageId, userId);
  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const share = await createShare(imageId, userId);
  if (!share) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  if (!share.code) {
    return NextResponse.json({ error: "Share code unavailable." }, { status: 500 });
  }
  const baseUrl = `/share/${share.code}.${image.ext}`;

  return NextResponse.json({
    share,
    urls: {
      original: baseUrl,
      sm: `/share/${share.code}-sm.${image.ext}`,
      lg: `/share/${share.code}-lg.${image.ext}`,
    },
  });
}

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

  let share = await getShareForUserByImage(imageId, userId);
  if (!share) {
    return NextResponse.json({ share: null });
  }

  if (!share.code) {
    share = await createShare(imageId, userId);
    if (!share?.code) {
      return NextResponse.json({ share: null });
    }
  }
  const baseUrl = `/share/${share.code}.${image.ext}`;
  return NextResponse.json({
    share,
    urls: {
      original: baseUrl,
      sm: `/share/${share.code}-sm.${image.ext}`,
      lg: `/share/${share.code}-lg.${image.ext}`,
    },
  });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as { imageId?: string };
  const imageId = payload?.imageId?.trim();

  if (!imageId) {
    return NextResponse.json({ error: "Image id is required." }, { status: 400 });
  }

  const deleted = await deleteShareForUser(imageId, userId);
  return NextResponse.json({ deleted });
}

