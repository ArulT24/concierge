import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";

const chatAuth = auth((req) => {
  if (!req.auth) {
    const signIn = new URL("/api/auth/signin", req.nextUrl.origin);
    signIn.searchParams.set(
      "callbackUrl",
      `${req.nextUrl.pathname}${req.nextUrl.search}`
    );
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}) as unknown as NextMiddleware;

/**
 * Marketing-only mode: only `/`, `/api/auth/*`, static assets, and `/chat`/`/kids-bday`
 * (with auth) are reachable; everything else returns 404.
 *
 * Opt-in with LANDING_ONLY=1 (e.g. a bare landing deploy). Default is full app — we do
 * not infer this from VERCEL=1, or every Vercel deploy would 404 `/api/chat` unless env
 * was set exactly right.
 */
function landingOnlyEnabled(): boolean {
  const v = (process.env.LANDING_ONLY ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function isPublicFile(pathname: string): boolean {
  return /\.(?:ico|png|jpg|jpeg|svg|gif|webp|txt|xml|json|webmanifest|woff2?)$/i.test(
    pathname
  );
}

function isAllowedPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (isPublicFile(pathname)) return true;
  return false;
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname === "/kids-bday" ||
    pathname.startsWith("/kids-bday/")
  ) {
    return chatAuth(request, event);
  }

  if (!landingOnlyEnabled()) {
    return NextResponse.next();
  }

  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
