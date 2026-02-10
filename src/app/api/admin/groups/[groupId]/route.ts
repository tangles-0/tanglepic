import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { deleteGroup, isAdminUser, listGroupsWithCounts } from "@/lib/metadata-store";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { groupId } = await params;
  const groups = await listGroupsWithCounts();
  const group = groups.find((item) => item.id === groupId);
  if (!group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  if (group.name === "admin") {
    return NextResponse.json({ error: "Admin group cannot be deleted." }, { status: 400 });
  }

  await deleteGroup(groupId);
  return NextResponse.json({ ok: true });
}

