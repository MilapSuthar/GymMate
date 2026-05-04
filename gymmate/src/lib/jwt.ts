import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { getTokenStore } from "./redis";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";

const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface AccessTokenPayload extends JwtPayload {
  sub: string; // user id
  email: string;
}

export function signAccessToken(userId: string, email: string): string {
  const payload: AccessTokenPayload = { sub: userId, email };
  const opts: SignOptions = { expiresIn: ACCESS_TTL_SECONDS };
  return jwt.sign(payload, ACCESS_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Refresh tokens are opaque random strings stored in Redis (key: refresh:<token>, value: userId).
 * We do NOT use JWT for refresh tokens because we need to invalidate them on logout — Redis
 * deletion gives us O(1) revocation that signed-but-not-revocable JWTs cannot.
 */
export async function issueRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString("hex");
  const store = getTokenStore();
  await store.set(`refresh:${token}`, userId, REFRESH_TTL_SECONDS);
  return token;
}

export async function consumeRefreshToken(token: string): Promise<string | null> {
  const store = getTokenStore();
  return store.get(`refresh:${token}`);
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const store = getTokenStore();
  await store.del(`refresh:${token}`);
}

export async function issueTokenPair(userId: string, email: string) {
  const accessToken = signAccessToken(userId, email);
  const refreshToken = await issueRefreshToken(userId);
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: ACCESS_TTL_SECONDS,
    refreshTokenExpiresIn: REFRESH_TTL_SECONDS,
  };
}
