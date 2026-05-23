#!/usr/bin/env node
/**
 * Tests real-time chat against the 8 milestones:
 *   1. /api/matches sorts matches by most recent message
 *   2. /api/messages/unread reflects unread badge count
 *   3. GET /api/messages/[matchId] returns history
 *   4. POST /api/messages/[matchId] saves a row in the DB
 *   5. Second user receives new message in real time via SSE
 *   6. Opening the chat marks messages as read (clears badge)
 *   7. User outside the match gets 403
 *   8. Pagination via ?before=<id> loads older messages
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
}

async function jsonReq(path, opts = {}, accessToken = null) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body && typeof opts.body !== "string") {
    headers["content-type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  if (accessToken) headers["authorization"] = `Bearer ${accessToken}`;
  const res = await fetch(BASE + path, {
    method: opts.method || "POST",
    headers,
    body: opts.body,
  });
  let body = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { body = await res.json(); } catch {}
  } else {
    try { body = await res.text(); } catch {}
  }
  return { status: res.status, body };
}

async function register(suffix) {
  const email = `chat+${suffix}+${Date.now()}@gymmate.dev`;
  const r = await jsonReq("/api/auth/register", {
    body: { name: `Chat ${suffix}`, email, password: "Password123!" },
  });
  if (r.status !== 201) {
    console.error("Registration failed:", r);
    process.exit(1);
  }
  return { token: r.body.accessToken, id: r.body.user.id, email };
}

async function makeMatch(a, b) {
  await jsonReq("/api/swipe", { body: { swipeeId: b.id, direction: "like" } }, a.token);
  const r = await jsonReq("/api/swipe", { body: { swipeeId: a.id, direction: "like" } }, b.token);
  if (!r.body?.isMatch) {
    console.error("Match did not form:", r);
    process.exit(1);
  }
  return r.body.match.id;
}

// ── Set up three users: A, B, and an outsider C ─────────────────────────
const A = await register("a");
const B = await register("b");
const C = await register("c");

// Two matches for A: (A,B) and (A,?). We'll only need (A,B), plus a stale
// "older" match to verify sort order.
const olderMatchTarget = await register("older");
const olderMatchId = await makeMatch(A, olderMatchTarget);
// Seed an old message in the older match so it has a lastMessage
await jsonReq(
  `/api/messages/${olderMatchId}`,
  { body: { content: "old message" } },
  A.token
);

const matchId = await makeMatch(A, B);

// Send a message from B → A in the new match (so it's newer than olderMatch)
await new Promise((r) => setTimeout(r, 50)); // ensure distinct timestamps
const seed = await jsonReq(
  `/api/messages/${matchId}`,
  { body: { content: "Hey there!" } },
  B.token
);

// ── 4. POST saves a message ─────────────────────────────────────────────
record(
  "4. Sending a message saves it to the DB",
  seed.status === 201 && !!seed.body?.message?.id && seed.body.message.content === "Hey there!",
  `status=${seed.status}, id=${seed.body?.message?.id}, content=${JSON.stringify(seed.body?.message?.content)}`
);

// ── 1. /api/matches sort by most recent ─────────────────────────────────
const aMatches = await jsonReq("/api/matches", { method: "GET" }, A.token);
const list = aMatches.body?.matches || [];
const sortOk =
  list.length >= 2 &&
  list[0].id === matchId && // newer match (just received message)
  list.some((m) => m.id === olderMatchId);
record(
  "1. Messages list shows matches sorted by most recent message",
  aMatches.status === 200 && sortOk,
  `order=[${list.map((m) => m.id.slice(-4)).join(",")}], expected newer (${matchId.slice(-4)}) first`
);

// ── 2. Unread badge count (A has 1 unread from B) ───────────────────────
const unread = await jsonReq("/api/messages/unread", { method: "GET" }, A.token);
const matchUnread = list.find((m) => m.id === matchId)?.unreadCount;
record(
  "2. Unread badge count shows on messages tab",
  unread.status === 200 && unread.body?.unread === 1 && matchUnread === 1,
  `total unread=${unread.body?.unread}, per-match unread=${matchUnread}`
);

// ── 3. GET chat history returns the message ─────────────────────────────
const hist = await jsonReq(`/api/messages/${matchId}`, { method: "GET" }, A.token);
const histOk =
  hist.status === 200 &&
  Array.isArray(hist.body?.messages) &&
  hist.body.messages.some((m) => m.content === "Hey there!");
record(
  "3. Chat screen loads message history for a match",
  histOk,
  `status=${hist.status}, count=${hist.body?.messages?.length}`
);

// ── 5. SSE delivery from B's POST → A's open stream ─────────────────────
let sseDelivered = false;
let sseError = null;
let streamMsg = null;
{
  // Open the stream as user A. We need to wait until the subscription is
  // actually registered server-side before posting from B — otherwise the
  // publish fires into the void. The route emits a `: connected` comment
  // immediately after subscribing, so we await that as a "ready" signal.
  const url = `${BASE}/api/messages/${matchId}/stream?token=${encodeURIComponent(A.token)}`;
  const controller = new AbortController();
  const sseTimeout = setTimeout(() => controller.abort(), 5000);

  const res = await fetch(url, { signal: controller.signal });
  if (!res.ok || !res.body) {
    sseError = `stream status=${res.status}`;
  } else {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    const readUntilReady = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return false;
        buf += decoder.decode(value, { stream: true });
        if (buf.includes(": connected")) return true;
      }
    })();
    const ready = await readUntilReady;
    if (!ready) sseError = "stream closed before ready";

    if (!sseError) {
      // Subscriber is live — post from B, then keep reading frames.
      const sent = await jsonReq(
        `/api/messages/${matchId}`,
        { body: { content: "live!" } },
        B.token
      );
      if (sent.status !== 201) sseError = `POST failed: ${sent.status}`;

      try {
        while (!sseDelivered) {
          let idx;
          while ((idx = buf.indexOf("\n\n")) !== -1) {
            const frame = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            for (const line of frame.split("\n")) {
              if (line.startsWith("data:")) {
                try {
                  const evt = JSON.parse(line.slice(5).trim());
                  if (evt.type === "message" && evt.message?.content === "live!") {
                    sseDelivered = true;
                    streamMsg = evt.message;
                    break;
                  }
                } catch {
                  /* ignore */
                }
              }
            }
          }
          if (sseDelivered) break;
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
        }
      } catch (e) {
        if (e.name !== "AbortError") sseError = String(e);
      }
    }
    controller.abort();
  }
  clearTimeout(sseTimeout);
  record(
    "5. Second user sees the new message in real time (SSE stream)",
    sseDelivered && streamMsg?.senderId === B.id,
    sseError ? `error=${sseError}` : `delivered=${sseDelivered}, senderId=${streamMsg?.senderId}`
  );
}

// ── 6. Marking as read clears the badge ─────────────────────────────────
const readRes = await jsonReq(`/api/messages/${matchId}/read`, {}, A.token);
const afterRead = await jsonReq("/api/messages/unread", { method: "GET" }, A.token);
record(
  "6. Opening a chat marks messages as read and clears the badge",
  readRes.status === 200 && readRes.body?.updated >= 1 && afterRead.body?.unread === 0,
  `markedRead=${readRes.body?.updated}, total unread after read=${afterRead.body?.unread}`
);

// ── 7. Outsider C gets 403 ──────────────────────────────────────────────
const denied = await jsonReq(`/api/messages/${matchId}`, { method: "GET" }, C.token);
const deniedPost = await jsonReq(
  `/api/messages/${matchId}`,
  { body: { content: "should fail" } },
  C.token
);
record(
  "7. User outside the match cannot access the chat (403 error)",
  denied.status === 403 && deniedPost.status === 403,
  `GET=${denied.status}, POST=${deniedPost.status}`
);

// ── 8. Pagination via ?before= ──────────────────────────────────────────
// Seed 25 messages so we definitely page (PAGE_SIZE = 20)
for (let i = 0; i < 25; i++) {
  await jsonReq(
    `/api/messages/${matchId}`,
    { body: { content: `bulk #${i}` } },
    i % 2 === 0 ? A.token : B.token
  );
}
const page1 = await jsonReq(`/api/messages/${matchId}`, { method: "GET" }, A.token);
const cursor = page1.body?.nextCursor;
const page2 = cursor
  ? await jsonReq(
      `/api/messages/${matchId}?before=${encodeURIComponent(cursor)}`,
      { method: "GET" },
      A.token
    )
  : { status: 0, body: null };
const noOverlap =
  page1.body && page2.body
    ? !page1.body.messages.some((a) =>
        page2.body.messages.some((b) => b.id === a.id)
      )
    : false;
record(
  "8. Pagination loads older messages via ?before= (no overlap)",
  page1.body?.messages?.length === 20 &&
    !!cursor &&
    page2.status === 200 &&
    page2.body?.messages?.length > 0 &&
    noOverlap,
  `page1=${page1.body?.messages?.length}, nextCursor=${!!cursor}, page2=${page2.body?.messages?.length}, no overlap=${noOverlap}`
);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
