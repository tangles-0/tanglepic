import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getUserTheme, setUserTheme } from "@/lib/metadata-store";
import { THEME_SET } from "@/components/theme/themes";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const theme = await getUserTheme(userId);
  return NextResponse.json({ theme });
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as { theme?: string };
  const theme = payload.theme?.trim();
  if (!theme || !THEME_SET.has(theme)) {
    return NextResponse.json({ error: "Invalid theme." }, { status: 400 });
  }

  await setUserTheme(userId, theme);
  return NextResponse.json({ ok: true, theme });
}

