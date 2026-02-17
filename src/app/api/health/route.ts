import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}

