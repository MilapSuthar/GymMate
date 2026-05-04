import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware. We don't verify the refresh token here (that requires the
 * Redis store / Prisma — both unavailable in the edge runtime). Cookie presence
 * is treated as "session likely exists"; the AuthContext does real verification
 * via /api/auth/refresh on mount, and bouncing back to /login is a non-issue
 * because the refresh endpoint will reject an invalid cookie.
 */
const PROTECTED_PATHS = ["/", "/match", "/help-board", "/trainers", "/nutrition", "/exercise"];
const AUTH_PATHS = ["/login", "/register"];
const REFRESH_COOKIE = "gm_refresh";

function isProtected(pathname: string) {
  if (pathname === "/") return true;
  return PROTECTED_PATHS.some((p) => p !== "/" && (pathname === p || pathname.startsWith(p + "/")));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = !!req.cookies.get(REFRESH_COOKIE)?.value;

  if (isProtected(pathname) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_PATHS.includes(pathname) && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Run on app routes only — skip API, static assets, _next, and the favicon.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
