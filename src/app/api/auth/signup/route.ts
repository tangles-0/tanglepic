import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const payload = (await request.json()) as {
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
  };
  const email = payload?.email?.trim().toLowerCase();
  const username = payload?.username?.trim().toLowerCase();
  const password = payload?.password;
  const confirmPassword = payload?.confirmPassword;

  if (!email || !username || !password || !confirmPassword) {
    return NextResponse.json(
      { error: "Username, email, and password are required." },
      { status: 400 },
    );
  }

  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Email format is invalid." }, { status: 400 });
  }

  if (username.length < 3) {
    return NextResponse.json(
      { error: "Username must be at least 3 characters." },
      { status: 400 },
    );
  }

  if (password.length <= 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: "Password must be >6 chars and include letters and numbers." },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await db.insert(users).values({
      id: randomUUID(),
      username,
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

