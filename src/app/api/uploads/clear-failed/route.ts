import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { clearUploadSessionsForUser } from "@/lib/upload-sessions";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as { sessionIds?: string[] };
  const sessionIds = Array.isArray(payload.sessionIds)
    ? payload.sessionIds.map((item) => String(item).trim()).filter(Boolean)
    : [];
  if (sessionIds.length === 0) {
    return NextResponse.json({ cleared: 0 });
  }

  const result = await clearUploadSessionsForUser(userId, sessionIds);
  return NextResponse.json(result);
}
