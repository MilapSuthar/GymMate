import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, AccessTokenPayload } from "./jwt";
import { rateLimit, tooManyRequests, type RateLimitRule } from "./rate-limit";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Extracts and verifies the bearer token from the Authorization header.
 * Throws AuthError on missing / malformed / invalid / expired tokens.
 */
export function getAuthFromRequest(req: NextRequest): AccessTokenPayload {
  const header = req.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw new AuthError(401, "Missing or malformed Authorization header");
  }
  const token = header.slice(7).trim();
  if (!token) {
    throw new AuthError(401, "Missing bearer token");
  }
  try {
    return verifyAccessToken(token);
  } catch (err) {
    const msg = err instanceof Error && err.name === "TokenExpiredError"
      ? "Access token expired"
      : "Invalid access token";
    throw new AuthError(401, msg);
  }
}

interface WithAuthOptions {
  /**
   * When set, the handler is rate limited per authenticated user. `name`
   * scopes the counter so different endpoints don't share a bucket.
   */
  rateLimit?: RateLimitRule & { name: string };
}

/**
 * Wrapper for protected route handlers. Validates JWT and passes user payload.
 * Use it like: export const GET = withAuth(async (req, user) => { ... });
 *
 * Pass `{ rateLimit }` to throttle a write endpoint per user:
 *   export const POST = withAuth(handler, {
 *     rateLimit: { name: "swipe", limit: 120, windowSeconds: 60 },
 *   });
 */
export function withAuth<T = unknown>(
  handler: (req: NextRequest, user: AccessTokenPayload, ctx: T) => Promise<Response>,
  options?: WithAuthOptions
) {
  return async (req: NextRequest, ctx: T): Promise<Response> => {
    // Auth extraction is synchronous — its throws are the only ones this
    // try/catch is meant to map. Handler errors deliberately propagate.
    let user: AccessTokenPayload;
    try {
      user = getAuthFromRequest(req);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (options?.rateLimit) {
      const { name, ...rule } = options.rateLimit;
      const result = await rateLimit(name, `user:${user.sub}`, rule);
      if (!result.allowed) return tooManyRequests(result);
    }

    return handler(req, user, ctx);
  };
}
