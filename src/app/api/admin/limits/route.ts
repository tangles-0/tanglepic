import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getGroupLimits, isAdminUser, upsertGroupLimits } from "@/lib/metadata-store";

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

  const defaults = await getGroupLimits(null);
  return NextResponse.json({ defaults });
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

  const payload = (await request.json()) as {
    groupId?: string | null;
    limits?: {
      maxFileSize?: number;
      allowedTypes?: string[];
      rateLimitPerMinute?: number;
    };
  };

  if (!payload.limits) {
    return NextResponse.json({ error: "Limits are required." }, { status: 400 });
  }

  const maxFileSize = Number(payload.limits.maxFileSize ?? 0);
  const allowedTypes = (payload.limits.allowedTypes ?? []).map((item) => item.trim());
  const rateLimitPerMinute = Number(payload.limits.rateLimitPerMinute ?? 0);

  if (!Number.isFinite(maxFileSize) || maxFileSize <= 0) {
    return NextResponse.json({ error: "Max file size must be greater than 0." }, { status: 400 });
  }

  if (!Number.isFinite(rateLimitPerMinute) || rateLimitPerMinute < 0) {
    return NextResponse.json({ error: "Rate limit must be 0 or more." }, { status: 400 });
  }

  const limits = await upsertGroupLimits({
    groupId: payload.groupId ?? null,
    maxFileSize,
    allowedTypes,
    rateLimitPerMinute,
  });

  return NextResponse.json({ limits });
}

