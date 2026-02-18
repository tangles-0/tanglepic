import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { countAdminUsers, promoteUserToAdmin } from "@/lib/metadata-store";
import { hasTrustedOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const bootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN?.trim();
  const providedToken = new URL(request.url).searchParams.get("token")?.trim();
  if (!bootstrapToken || !providedToken || providedToken !== bootstrapToken) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}