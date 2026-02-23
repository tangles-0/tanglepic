import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { completeUploadSession, getUploadSessionForUser } from "@/lib/upload-sessions";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as { sessionId?: string };
  const sessionId = payload.sessionId?.trim() ?? "";
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = await getUploadSessionForUser(sessionId, userId);
  if (!session) {
    return NextResponse.json({ error: "Upload session not found." }, { status: 404 });
  }

  try {
    const completed = await completeUploadSession(session);
    return NextResponse.json({
      sessionId: completed.id,
      state: completed.state,
      storageKey: completed.storageKey,
      fileName: completed.fileName,
      mimeType: completed.mimeType,
      ext: completed.ext,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete upload." },
      { status: 500 },
    );
  }
}

