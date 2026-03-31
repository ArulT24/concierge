import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * On Vercel, only the marketing landing and its waitlist proxy are exposed.
 * Set LANDING_ONLY=0 in the Vercel project env to serve the full Next app.
 */
function landingOnlyEnabled(): boolean {
  if (process.env.LANDING_ONLY === "0") return false;
  return process.env.LANDING_ONLY === "1" || process.env.VERCEL === "1";
}

function isPublicFile(pathname: string): boolean {
  return /\.(?:ico|png|jpg|jpeg|svg|gif|webp|txt|xml|json|webmanifest|woff2?)$/i.test(
    pathname
  );
}

function isAllowedPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return true;
  if (pathname === "/pixel") return true;
  if (pathname === "/api/landing-waitlist") return true;
  if (isPublicFile(pathname)) return true;
  return false;
}

export function proxy(request: NextRequest) {
  if (!landingOnlyEnabled()) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
