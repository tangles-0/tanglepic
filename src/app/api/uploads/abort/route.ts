import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { abortUploadSession, getUploadSessionForUser } from "@/lib/upload-sessions";

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
  await abortUploadSession(session);
  return NextResponse.json({ ok: true });
}

