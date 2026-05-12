import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, AuthError } from "@/lib/auth";
import { loadMatchForUser } from "@/lib/match-access";
import { subscribe, type ChatEvent } from "@/lib/message-bus";

interface Ctx {
  params: Promise<{ matchId: string }>;
}

// SSE must run on the Node runtime — the edge runtime doesn't support the
// long-lived ReadableStream pattern we need for keeping the connection open.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/messages/[matchId]/stream — Server-Sent Events for new messages.
 *
 * Auth note: EventSource cannot send custom headers, so we accept the access
 * token via `?token=...` query param instead of `Authorization: Bearer ...`.
 * The token is short-lived (15 min) so query-string exposure is bounded —
 * but it's still less safe than headers, so this is the only auth surface
 * that uses query-string tokens.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { matchId } = await ctx.params;

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token query param" }, { status: 401 });
  }

  // Reuse the bearer-token verifier by injecting a synthetic Authorization header.
  const proxied = new Request(req.url, {
    headers: { authorization: `Bearer ${token}` },
  }) as unknown as NextRequest;

  let payload;
  try {
    payload = getAuthFromRequest(proxied);
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 401;
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status });
  }

  const access = await loadMatchForUser(matchId, payload.sub);
  if (!access) {
    return NextResponse.json({ error: "Match not found or access denied" }, { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: ChatEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // controller already closed — listener cleanup happens in cancel()
        }
      };

      // Initial "ready" frame so the client can show "connected" status
      controller.enqueue(encoder.encode(`: connected\n\n`));

      unsubscribe = subscribe(matchId, send);

      // SSE comment heartbeat every 25s — keeps proxies (Vercel's, Cloudflare's)
      // from reaping the connection as idle. Comments don't fire onmessage on
      // the client side, so the chat UI stays clean.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // closed
        }
      }, 25_000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Disable nginx buffering if it ever ends up in front of us.
      "x-accel-buffering": "no",
    },
  });
}
