import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import {
  getLatestPatchNote,
  listPatchNotes,
  setUserLastPatchNoteDismissed,
} from "@/lib/metadata-store";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  let limit: number | undefined;
  if (limitRaw) {
    const parsed = Number(limitRaw);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 250) {
      return NextResponse.json({ error: "Invalid limit." }, { status: 400 });
    }
    limit = Math.floor(parsed);
  }

  const notes = await listPatchNotes(limit);
  return NextResponse.json({ notes });
}

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  if (action !== "dismiss-latest") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const latest = await getLatestPatchNote();
  if (!latest) {
    await setUserLastPatchNoteDismissed(userId, null);
    return NextResponse.json({ ok: true, dismissedAt: null });
  }

  const dismissedAt = new Date(latest.publishedAt);
  await setUserLastPatchNoteDismissed(userId, dismissedAt);
  return NextResponse.json({ ok: true, dismissedAt: dismissedAt.toISOString() });
}

