import { NextResponse } from "next/server";
import { getPatchNoteById } from "@/lib/metadata-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patchNoteId: string }> },
): Promise<NextResponse> {
  const { patchNoteId } = await params;
  const note = await getPatchNoteById(patchNoteId);
  if (!note) {
    return NextResponse.json({ error: "Patch note not found." }, { status: 404 });
  }
  return NextResponse.json({ note });
}

