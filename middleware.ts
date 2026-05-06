import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/admin/login" ||
    pathname === "/admin/signup" ||
    pathname === "/admin/reset-password" ||
    pathname.startsWith("/admin/reset-password/")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }

    const verified = await verifyToken(token);

    if (!verified) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
