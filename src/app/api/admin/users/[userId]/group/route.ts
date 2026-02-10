import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getUserGroupInfo, isAdminUser, setUserGroup } from "@/lib/metadata-store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const currentUserId = await getSessionUserId();
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = await isAdminUser(currentUserId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { userId } = await params;
  const payload = (await request.json()) as { groupId?: string | null };
  const groupId = payload?.groupId ?? null;

  if (userId === currentUserId) {
    const info = await getUserGroupInfo(currentUserId);
    if (info.groupName === "admin" && groupId !== info.groupId) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the admin group." },
        { status: 400 },
      );
    }
  }

  await setUserGroup(userId, groupId);
  return NextResponse.json({ ok: true });
}

