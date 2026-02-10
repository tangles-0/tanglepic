import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { countAdminUsers, promoteUserToAdmin } from "@/lib/metadata-store";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const adminCount = await countAdminUsers();
  if (adminCount > 0) {
    const origin = new URL(request.url).origin;
    const notFoundTarget = `${origin}/__not-found__/${Date.now()}`;
    const notFoundResponse = await fetch(notFoundTarget);
    const html = await notFoundResponse.text();
    return new NextResponse(html, {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  await promoteUserToAdmin(userId);
  return NextResponse.json({ ok: true });
}

