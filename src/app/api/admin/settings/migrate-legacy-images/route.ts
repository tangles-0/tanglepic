import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { isAdminUser } from "@/lib/metadata-store";
import { migrateLegacyImageStorage } from "@/lib/legacy-image-migration";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const report = await migrateLegacyImageStorage();
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed." },
      { status: 500 },
    );
  }
}

