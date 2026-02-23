import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { extFromFileName } from "@/lib/media-types";
import { initUploadSession } from "@/lib/upload-sessions";

export const runtime = "nodejs";

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    chunkSize?: number;
    targetType?: "image" | "video" | "document" | "other";
  };

  const fileName = payload.fileName?.trim() ?? "";
  const fileSize = Number(payload.fileSize ?? 0);
  const mimeType = payload.mimeType?.trim() ?? "application/octet-stream";
  const chunkSize = Math.max(1024 * 1024, Number(payload.chunkSize ?? DEFAULT_CHUNK_SIZE));
  const ext = extFromFileName(fileName);

  if (!fileName || !ext) {
    return NextResponse.json({ error: "File name with extension is required." }, { status: 400 });
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: "File size must be greater than 0." }, { status: 400 });
  }

  const session = await initUploadSession({
    userId,
    fileName,
    fileSize,
    chunkSize,
    mimeType,
    ext,
    targetType: payload.targetType,
  });

  return NextResponse.json({
    sessionId: session.id,
    chunkSize: session.chunkSize,
    totalParts: session.totalParts,
    uploadedParts: session.uploadedParts,
  });
}

