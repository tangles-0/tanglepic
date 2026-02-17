import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { createPatchNote, isAdminUser } from "@/lib/metadata-store";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json()) as { content?: string };
  const content = payload.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  const note = await createPatchNote(content);
  return NextResponse.json({ note });
}

