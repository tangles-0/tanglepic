import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { listIncompleteUploadSessionsForUser } from "@/lib/upload-sessions";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const sessions = await listIncompleteUploadSessionsForUser(userId);
  return NextResponse.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      fileName: session.fileName,
      fileSize: session.fileSize,
      chunkSize: session.chunkSize,
      totalParts: session.totalParts,
      uploadedPartsCount: Object.keys(session.uploadedParts).length,
      state: session.state,
      checksum: session.checksum,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      mimeType: session.mimeType,
      ext: session.ext,
    })),
  });
}
