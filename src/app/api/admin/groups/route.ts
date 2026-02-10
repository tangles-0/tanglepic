import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { createGroup, isAdminUser, listGroupsWithCounts } from "@/lib/metadata-store";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const groups = await listGroupsWithCounts();
  return NextResponse.json({ groups });
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json()) as { name?: string };
  const name = payload?.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Group name is required." }, { status: 400 });
  }

  const group = await createGroup(name);
  return NextResponse.json({ group });
}

