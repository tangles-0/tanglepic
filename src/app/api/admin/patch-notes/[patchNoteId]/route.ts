import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { deletePatchNote, isAdminUser, updatePatchNote } from "@/lib/metadata-store";

export const runtime = "nodejs";

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return { userId };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ patchNoteId: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const payload = (await request.json()) as { content?: string };
  const content = payload.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  const { patchNoteId } = await params;
  const note = await updatePatchNote(patchNoteId, content);
  if (!note) {
    return NextResponse.json({ error: "Patch note not found." }, { status: 404 });
  }
  return NextResponse.json({ note });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ patchNoteId: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { patchNoteId } = await params;
  const deleted = await deletePatchNote(patchNoteId);
  if (!deleted) {
    return NextResponse.json({ error: "Patch note not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

