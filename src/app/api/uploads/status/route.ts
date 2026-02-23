import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getUploadSessionForUser } from "@/lib/upload-sessions";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId")?.trim() ?? "";
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }
  const session = await getUploadSessionForUser(sessionId, userId);
  if (!session) {
    return NextResponse.json({ error: "Upload session not found." }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: session.id,
    state: session.state,
    uploadedParts: session.uploadedParts,
    totalParts: session.totalParts,
    fileName: session.fileName,
    fileSize: session.fileSize,
    chunkSize: session.chunkSize,
    checksum: session.checksum,
    storageKey: session.storageKey,
  });
}

