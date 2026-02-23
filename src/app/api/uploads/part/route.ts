import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import {
  getUploadSessionForUser,
  markUploadSessionFailedForUser,
  uploadSessionPart,
} from "@/lib/upload-sessions";

export const runtime = "nodejs";

function isConnectionResetError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as Error & { code?: string }).code ?? "";
  if (code === "ECONNRESET" || code === "ERR_STREAM_PREMATURE_CLOSE" || code === "UND_ERR_SOCKET") {
    return true;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("econnreset") ||
    message.includes("aborted") ||
    message.includes("premature close") ||
    message.includes("socket")
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let hintedSessionId = request.headers.get("x-upload-session-id")?.trim() ?? "";
  try {
    const formData = await request.formData();
    const sessionId = String(formData.get("sessionId") ?? hintedSessionId).trim();
    hintedSessionId = sessionId || hintedSessionId;
    const partNumber = Number(formData.get("partNumber") ?? 0);
    const filePart = formData.get("chunk");

    if (!sessionId || !Number.isFinite(partNumber) || partNumber <= 0) {
      return NextResponse.json({ error: "sessionId and partNumber are required." }, { status: 400 });
    }
    if (!(filePart instanceof File)) {
      return NextResponse.json({ error: "chunk file is required." }, { status: 400 });
    }

    const session = await getUploadSessionForUser(sessionId, userId);
    if (!session) {
      return NextResponse.json({ error: "Upload session not found." }, { status: 404 });
    }
    if (session.state === "complete" || session.state === "finalizing") {
      return NextResponse.json({ error: "Upload session is not writable." }, { status: 409 });
    }

    const data = Buffer.from(await filePart.arrayBuffer());
    const uploaded = await uploadSessionPart(session, partNumber, data);
    return NextResponse.json({ etag: uploaded.etag, partNumber });
  } catch (error) {
    if (hintedSessionId && isConnectionResetError(error)) {
      await markUploadSessionFailedForUser(hintedSessionId, userId, "connection reset");
      return NextResponse.json({ error: "Upload interrupted." }, { status: 499 });
    }
    throw error;
  }
}

