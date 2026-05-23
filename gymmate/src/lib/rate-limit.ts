/**
 * Best-effort rate limiting.
 *
 * Uses Redis (atomic INCR) when REDIS_URL is set, otherwise an in-process
 * counter Map so the dev server runs without a Redis instance.
 *
 * The limiter ALWAYS fails open: if Redis is unreachable or any limiter call
 * throws, the request is allowed through. A broken limiter must never be able
 * to take the API down — it is a guardrail, not a gate.
 *
 * The algorithm is a fixed-window counter: time is divided into buckets of
 * `windowSeconds`, each request increments the bucket's counter, and the
 * counter key expires when the bucket does. Simpler than a true sliding
 * window and entirely adequate for abuse / brute-force protection.
 */
import { NextResponse } from "next/server";
import Redis from "ioredis";

export interface RateLimitRule {
  /** Maximum requests permitted within one window. */
  limit: number;
  /** Window length, in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requests left in the current window (0 once blocked). */
  remaining: number;
  limit: number;
  /** Seconds until the window resets — use as the Retry-After header. */
  retryAfterSeconds: number;
}

// ---- Redis client (lazy, shared, fail-safe) -------------------------------

// `undefined` = not yet initialised, `null` = no Redis configured / failed.
let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    redis = null;
    return redis;
  }
  try {
    const client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    // Without an error listener ioredis emits an unhandled 'error' event and
    // crashes the process when Redis is down. We swallow it and fail open.
    client.on("error", () => {});
    redis = client;
  } catch {
    redis = null;
  }
  return redis;
}

// ---- In-memory fallback ---------------------------------------------------

const memory = new Map<string, { count: number; expiresAt: number }>();

/** Drop expired entries so the Map can't grow without bound. */
function sweepMemory() {
  if (memory.size < 5000) return;
  const now = Date.now();
  for (const [k, v] of memory) {
    if (v.expiresAt <= now) memory.delete(k);
  }
}

// ---- Core -----------------------------------------------------------------

/**
 * Record one hit against `identifier` for the named limiter and report
 * whether it is allowed. Never throws.
 */
export async function rateLimit(
  name: string,
  identifier: string,
  rule: RateLimitRule
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const windowMs = rule.windowSeconds * 1000;
  const windowIndex = Math.floor(nowMs / windowMs);
  const resetAtMs = (windowIndex + 1) * windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
  const key = `rl:${name}:${identifier}:${windowIndex}`;

  const client = getRedis();
  if (client) {
    try {
      const count = await client.incr(key);
      // Set the TTL only on the first hit of a fresh window.
      if (count === 1) {
        await client.expire(key, rule.windowSeconds);
      }
      return {
        allowed: count <= rule.limit,
        remaining: Math.max(0, rule.limit - count),
        limit: rule.limit,
        retryAfterSeconds,
      };
    } catch {
      // Fail open — a limiter outage must not block real traffic.
      return {
        allowed: true,
        remaining: rule.limit,
        limit: rule.limit,
        retryAfterSeconds: 0,
      };
    }
  }

  // In-memory fallback.
  sweepMemory();
  const entry = memory.get(key);
  if (!entry || entry.expiresAt <= nowMs) {
    memory.set(key, { count: 1, expiresAt: resetAtMs });
    return {
      allowed: true,
      remaining: rule.limit - 1,
      limit: rule.limit,
      retryAfterSeconds,
    };
  }
  entry.count += 1;
  return {
    allowed: entry.count <= rule.limit,
    remaining: Math.max(0, rule.limit - entry.count),
    limit: rule.limit,
    retryAfterSeconds,
  };
}

// ---- HTTP helpers ---------------------------------------------------------

/**
 * Best-effort client IP, read from the proxy headers a Next.js deployment
 * sits behind. Falls back to a constant so an unknown source still shares a
 * single bucket rather than bypassing the limiter entirely.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** The 429 response to return when a limit is exceeded. */
export function tooManyRequests(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

/**
 * One-call guard for route handlers: records a hit and, if the limit is
 * exceeded, returns a ready-to-return 429. Returns `null` when allowed.
 */
export async function enforceRateLimit(
  name: string,
  identifier: string,
  rule: RateLimitRule
): Promise<NextResponse | null> {
  const result = await rateLimit(name, identifier, rule);
  return result.allowed ? null : tooManyRequests(result);
}
