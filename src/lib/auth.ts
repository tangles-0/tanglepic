import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isDatabaseUnavailableError } from "@/lib/db-errors";

type LoginAttempt = {
  count: number;
  resetAt: number;
};

const loginAttempts = new Map<string, LoginAttempt>();
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 20;

type RequestHeaders =
  | Headers
  | Record<string, string | string[] | undefined>;

type RequestLike = {
  headers?: RequestHeaders;
};

function readHeader(headers: RequestHeaders | undefined, key: string): string | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    return headers.get(key) ?? undefined;
  }
  const value = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

function getClientKey(request: RequestLike | undefined): string {
  const forwarded = readHeader(request?.headers, "x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || readHeader(request?.headers, "x-real-ip") || "unknown";
  return ip;
}

function checkLoginRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= LOGIN_MAX_ATTEMPTS;
}

function resetLoginRateLimit(key: string): void {
  loginAttempts.delete(key);
}

async function userExists(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return Boolean(row);
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signOut: "/signout",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();

        if (!email || !password) {
          return null;
        }

        const key = getClientKey(request);
        if (!checkLoginRateLimit(key)) {
          return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        resetLoginRateLimit(key);
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        return token;
      }

      if (!token.sub) {
        return token;
      }

      try {
        const exists = await userExists(token.sub);
        if (!exists) {
          // Invalidate stale JWT-backed sessions when the user no longer exists.
          return {};
        }
      } catch (error) {
        if (isDatabaseUnavailableError(error)) {
          return {};
        }
        throw error;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) {
        return;
      }
      try {
        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
      } catch (error) {
        if (!isDatabaseUnavailableError(error)) {
          throw error;
        }
      }
    },
  },
};

export async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return null;
    }
    const exists = await userExists(userId);
    return exists ? userId : null;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return null;
    }
    throw error;
  }
}

