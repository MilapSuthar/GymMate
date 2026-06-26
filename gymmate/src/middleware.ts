import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware. We don't verify the refresh token here (that requires the
 * Redis store / Prisma — both unavailable in the edge runtime). Cookie presence
 * is treated as "session likely exists"; the AuthContext does real verification
 * via /api/auth/refresh on mount, and bouncing back to /login is a non-issue
 * because the refresh endpoint will reject an invalid cookie.
 */
// Every signed-in surface. A path is protected if it equals one of these or
// is nested under it. Keep this in sync when adding new top-level routes —
// anything missing here is silently reachable while logged out.
const PROTECTED_PATHS = [
  "/",
  "/community",
  "/help-board",
  "/trainers",
  "/nutrition",
  "/exercise",
  "/profile",
  "/matches",
  "/likes",
  "/notifications",
  "/onboarding",
  "/become-trainer",
  "/trainer",
  "/booking",
];
// Routes that should bounce *logged-in* users away (so they don't sit on
// the marketing landing or the login form when they already have a session).
// /welcome is the public marketing surface; login and register are auth forms.
const AUTH_PATHS = ["/login", "/register", "/welcome"];
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
    // Anonymous visitors hitting `/` land on the marketing page instead of
    // being dumped straight on a login form (the single biggest top-of-funnel
    // drop-off pattern in a swipe-style product). Every other protected
    // surface still routes to /login with a ?next= return path.
    if (pathname === "/") {
      url.pathname = "/welcome";
    } else {
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
    }
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
