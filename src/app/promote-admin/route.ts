import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { countAdminUsers, promoteUserToAdmin } from "@/lib/metadata-store";
import { hasTrustedOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

// uncomment this for local development to bypass checks
// export async function GET(request: Request): Promise<NextResponse> {
//   const userId = await getSessionUserId();
//   console.log("USER ID IS", userId);
//   console.log("Nextauth session token is", request.headers.get("Cookie"));
//   await promoteUserToAdmin(userId ?? "");
//   return NextResponse.json({ ok: true });
// }

const notFoundHeaders = {
  status: 404,
  headers: {
    "Content-Type": "text/html; charset=utf-8",
  },
}

const getNotFoundResponse = async (request: Request): Promise<string> => {
  const origin = new URL(request.url).origin;
  const notFoundTarget = `${origin}/__not-found__/${Date.now()}`;
  const notFoundResponse = await fetch(notFoundTarget);
  const html = await notFoundResponse.text();
  return html
}

// require a bootstrap token ONLY to promote a logged-in user to admin
export async function GET(request: Request): Promise<NextResponse> {

  // uncomment to disallow GET request
  //return NextResponse.json({ error: "Method not allowed." }, { status: 405 });

  const url = new URL(request.url);
  const bootstrapToken = url.searchParams.get("bootstrapToken")?.trim();
  const bootstrapTokenSecret = process.env.ADMIN_BOOTSTRAP_TOKEN ?? "";
  const userId = await getSessionUserId();

  if (!userId || bootstrapToken !== bootstrapTokenSecret || !bootstrapTokenSecret) {
    const html = await getNotFoundResponse(request);
    return new NextResponse(html, notFoundHeaders);
  }

  // only run this after other checks have passed as we're calling the db
  const adminCount = await countAdminUsers();
  if (adminCount > 0) {
    const html = await getNotFoundResponse(request);
    return new NextResponse(html, notFoundHeaders);
  }
  
  await promoteUserToAdmin(userId);
  return NextResponse.json({ ok: true });
}

// require a bootstrap token AND trusted origin AND to be logged in to promote an admin
export async function POST(request: Request): Promise<NextResponse> {
  const bootstrapTokenSecret = process.env.ADMIN_BOOTSTRAP_TOKEN?.trim();
  const bootstrapToken = new URL(request.url).searchParams.get("token")?.trim();
  const userId = await getSessionUserId();

  if (!userId || bootstrapTokenSecret || !bootstrapToken || bootstrapToken !== bootstrapTokenSecret) {
    const html = await getNotFoundResponse(request);
    return new NextResponse(html, notFoundHeaders);
  }

  if (!hasTrustedOrigin(request)) {
    const html = await getNotFoundResponse(request);
    return new NextResponse(html, notFoundHeaders);
  }

  // only run this after other checks have passed as we're calling the db
  const adminCount = await countAdminUsers();
  if (adminCount > 0) {
    const html = await getNotFoundResponse(request);
    return new NextResponse(html, notFoundHeaders);
  }

  await promoteUserToAdmin(userId);
  return NextResponse.json({ ok: true });
}

