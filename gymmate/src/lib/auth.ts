import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, AccessTokenPayload } from "./jwt";

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

/**
 * Wrapper for protected route handlers. Validates JWT and passes user payload.
 * Use it like: export const GET = withAuth(async (req, user) => { ... });
 */
export function withAuth<T = unknown>(
  handler: (req: NextRequest, user: AccessTokenPayload, ctx: T) => Promise<Response>
) {
  return async (req: NextRequest, ctx: T): Promise<Response> => {
    try {
      const user = getAuthFromRequest(req);
      return handler(req, user, ctx);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  };
}
