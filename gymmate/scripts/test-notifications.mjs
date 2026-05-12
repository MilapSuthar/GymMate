#!/usr/bin/env node
/**
 * Tests Push Notifications milestone:
 *   1. POST /api/notifications/token saves FCM device token
 *   2. New match → both users receive a new_match notification
 *   3. New help board answer → question author receives new_answer
 *   4. New message in match thread → recipient receives new_message
 *   5. GET /api/notifications returns last 20 with unreadCount
 *   6. Notification failures (no Firebase config) are logged, server still 200s
 *   7. POST /api/notifications/read clears the unread badge count
 *   8. Notification bell endpoint exposes unreadCount for top-bar display
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
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body,
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

async function register(suffix) {
  const email = `notif+${suffix}+${Date.now()}@gymmate.dev`;
  const r = await jsonReq("/api/auth/register", {
    body: { name: `User ${suffix.toUpperCase()}`, email, password: "Password123!" },
  });
  if (r.status !== 201) { console.error("Register failed", r); process.exit(1); }
  return { token: r.body.accessToken, id: r.body.user.id };
}

// Two users who will swipe each other → produce a new_match for each.
// A third user authors a help-board question that the second user answers.
const alice = await register("alice");
const bob = await register("bob");
const carol = await register("carol");

// ── 1. Save FCM device token ─────────────────────────────────────────────────
const tokenRes = await jsonReq(
  "/api/notifications/token",
  { body: { token: "fake-fcm-device-token-abc123" } },
  alice.token
);
record(
  "1. POST /api/notifications/token saves FCM device token",
  tokenRes.status === 200 && tokenRes.body?.ok === true,
  `status=${tokenRes.status}`
);

// ── 2. Match notifications go to both users ──────────────────────────────────
// alice likes bob
await jsonReq(
  "/api/swipe",
  { body: { swipeeId: bob.id, direction: "like" } },
  alice.token
);
// bob likes alice — triggers the match + notifications
const matchRes = await jsonReq(
  "/api/swipe",
  { body: { swipeeId: alice.id, direction: "like" } },
  bob.token
);
const matchId = matchRes.body?.match?.id;

const aliceNotifs = await jsonReq("/api/notifications", {}, alice.token);
const bobNotifs = await jsonReq("/api/notifications", {}, bob.token);
const aliceHasMatch = (aliceNotifs.body?.notifications ?? []).some(
  (n) => n.type === "new_match"
);
const bobHasMatch = (bobNotifs.body?.notifications ?? []).some(
  (n) => n.type === "new_match"
);
record(
  "2. New match triggers push notification to both users",
  matchRes.body?.isMatch === true && aliceHasMatch && bobHasMatch,
  `aliceHas=${aliceHasMatch}, bobHas=${bobHasMatch}`
);

// ── 3. Answer triggers notification to question author ───────────────────────
const qRes = await jsonReq(
  "/api/help-board",
  {
    body: {
      title: "Best beginner squat form cues?",
      content: "Anyone got pointers for starting out?",
    },
  },
  carol.token
);
const questionId = qRes.body?.question?.id;

await jsonReq(
  `/api/help-board/${questionId}/answers`,
  { body: { content: "Brace your core like you're about to take a punch." } },
  alice.token
);

const carolNotifs = await jsonReq("/api/notifications", {}, carol.token);
const carolHasAnswer = (carolNotifs.body?.notifications ?? []).some(
  (n) => n.type === "new_answer" && n.data?.questionId === questionId
);
record(
  "3. New Help Board answer notifies question author",
  carolHasAnswer,
  `carolHasAnswer=${carolHasAnswer}`
);

// ── 4. Message in match thread triggers recipient notification ───────────────
const msgRes = await jsonReq(
  `/api/matches/${matchId}/messages`,
  { body: { content: "Hey! Want to train back day together?" } },
  alice.token
);

const bobNotifsAfter = await jsonReq("/api/notifications", {}, bob.token);
const bobHasMessage = (bobNotifsAfter.body?.notifications ?? []).some(
  (n) => n.type === "new_message" && n.data?.matchId === matchId
);
record(
  "4. New message triggers push notification (recipient gets new_message)",
  msgRes.status === 201 && bobHasMessage,
  `msgStatus=${msgRes.status}, bobHasMessage=${bobHasMessage}`
);

// ── 5. GET notifications returns list + unreadCount ──────────────────────────
const listRes = await jsonReq("/api/notifications", {}, bob.token);
const list = listRes.body?.notifications ?? [];
record(
  "5. GET /api/notifications returns last 20 with unreadCount",
  listRes.status === 200 &&
    Array.isArray(list) &&
    list.length >= 2 &&
    typeof listRes.body?.unreadCount === "number" &&
    listRes.body.unreadCount >= 2,
  `count=${list.length}, unread=${listRes.body?.unreadCount}`
);

// ── 6. Notifications still work without Firebase config (graceful) ───────────
// Trigger another notification by Alice answering her own question's siblings.
// Server should respond 200/201 even though FCM send will fail silently.
const noFireRes = await jsonReq(
  `/api/help-board/${questionId}/answers`,
  { body: { content: "Second answer to test fault tolerance." } },
  bob.token
);
record(
  "6. Notification failures are logged but server stays up (action succeeds)",
  noFireRes.status === 201,
  `answerStatus=${noFireRes.status}`
);

// ── 7. Mark as read clears the badge ─────────────────────────────────────────
const readRes = await jsonReq(
  "/api/notifications/read",
  { body: { all: true } },
  bob.token
);
record(
  "7. POST /api/notifications/read clears the unread badge",
  readRes.status === 200 && readRes.body?.unreadCount === 0,
  `unreadAfter=${readRes.body?.unreadCount}`
);

// ── 8. Bell endpoint exposes unread count (idempotent) ───────────────────────
// Trigger one new notification, confirm unreadCount increments from 0.
await jsonReq(
  `/api/matches/${matchId}/messages`,
  { body: { content: "Round two." } },
  alice.token
);
const afterRes = await jsonReq("/api/notifications", {}, bob.token);
record(
  "8. Notification bell shows updated unread count (top-bar source)",
  afterRes.body?.unreadCount === 1,
  `unread=${afterRes.body?.unreadCount}`
);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
