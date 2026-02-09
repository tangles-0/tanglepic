import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const payload = (await request.json()) as { email?: string; password?: string };
  const email = payload?.email?.trim().toLowerCase();
  const password = payload?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await db.insert(users).values({
      id: randomUUID(),
      email,
      passwordHash,
      createdAt: new Date(),
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}

