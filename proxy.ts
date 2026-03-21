import { NextResponse } from "next/server";
import { auth } from "@/auth";

function isAdminOnlyPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/gamelog");
}

export const proxy = auth(function proxyFn(request) {
  const { pathname, search } = request.nextUrl;
  const session = request.auth;

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminOnlyPath(pathname) && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/gamelog/:path*"],
};
