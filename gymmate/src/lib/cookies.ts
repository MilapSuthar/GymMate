import { NextResponse } from "next/server";

export const REFRESH_COOKIE = "gm_refresh";
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

export function setRefreshCookie(res: NextResponse, refreshToken: string) {
  res.cookies.set({
    name: REFRESH_COOKIE,
    value: refreshToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  });
}

export function clearRefreshCookie(res: NextResponse) {
  res.cookies.set({
    name: REFRESH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
