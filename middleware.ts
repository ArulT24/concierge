import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    const signIn = new URL("/api/auth/signin", req.nextUrl.origin);
    signIn.searchParams.set(
      "callbackUrl",
      `${req.nextUrl.pathname}${req.nextUrl.search}`
    );
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/chat"],
};
