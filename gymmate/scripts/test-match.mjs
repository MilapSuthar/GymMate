#!/usr/bin/env node
/**
 * Tests the Match feature against the 8 milestones:
 *   1. /api/discover returns real users from the database
 *   2. Swiped users do not appear again on a subsequent /api/discover call
 *   3. POST /api/swipe with direction=like records a `liked: true` swipe
 *   4. POST /api/swipe with direction=pass records a `liked: false` swipe
 *   5. Mutual likes create a Match and return { isMatch: true }
 *   6. One-sided like does not create a Match
 *   7. /api/discover returns no users when none remain (empty state)
 *   8. /api/matches returns the created match with otherUser populated
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
  const email = `match+${suffix}+${Date.now()}@gymmate.dev`;
  const r = await jsonReq("/api/auth/register", {
    body: { name: `Match Tester ${suffix}`, email, password: "Password123!" },
  });
  if (r.status !== 201) {
    console.error("Registration failed for", suffix, r);
    process.exit(1);
  }
  return { token: r.body.accessToken, id: r.body.user.id, email };
}

// ── Set up three fresh users: me, A, B ──────────────────────────────────
const me = await register("me");
const userA = await register("a");
const userB = await register("b");

// ── 1. /api/discover returns real users ─────────────────────────────────
const disc1 = await jsonReq("/api/discover", { method: "GET" }, me.token);
const ids1 = (disc1.body?.users || []).map((u) => u.id);
const sawA = ids1.includes(userA.id);
const sawB = ids1.includes(userB.id);
record(
  "1. /api/discover returns real users from the database",
  disc1.status === 200 && sawA && sawB && !ids1.includes(me.id),
  `status=${disc1.status}, count=${ids1.length}, saw A=${sawA}, saw B=${sawB}, excludes self=${!ids1.includes(me.id)}`
);

// ── 3. heart button records a like swipe ────────────────────────────────
const likeA = await jsonReq(
  "/api/swipe",
  { body: { swipeeId: userA.id, direction: "like" } },
  me.token
);
record(
  "3. Heart button records a 'like' swipe in DB",
  likeA.status === 200 && likeA.body?.isMatch === false,
  `status=${likeA.status}, isMatch=${likeA.body?.isMatch}`
);

// ── 4. X button records a pass swipe ────────────────────────────────────
const passB = await jsonReq(
  "/api/swipe",
  { body: { swipeeId: userB.id, direction: "pass" } },
  me.token
);
record(
  "4. X button records a 'pass' swipe in DB",
  passB.status === 200 && passB.body?.isMatch === false,
  `status=${passB.status}, isMatch=${passB.body?.isMatch}`
);

// ── 2. swiped users don't reappear ──────────────────────────────────────
const disc2 = await jsonReq("/api/discover", { method: "GET" }, me.token);
const ids2 = (disc2.body?.users || []).map((u) => u.id);
const aGone = !ids2.includes(userA.id);
const bGone = !ids2.includes(userB.id);
record(
  "2. Swiped users do not appear again after refresh",
  disc2.status === 200 && aGone && bGone,
  `A excluded=${aGone}, B excluded=${bGone}, remaining ids=${ids2.length}`
);

// ── 6. one-sided like does NOT create a Match ───────────────────────────
const myMatchesBefore = await jsonReq("/api/matches", { method: "GET" }, me.token);
record(
  "6. One-sided like does not create a Match",
  myMatchesBefore.status === 200 &&
    Array.isArray(myMatchesBefore.body?.matches) &&
    myMatchesBefore.body.matches.length === 0,
  `match count after one-sided like = ${myMatchesBefore.body?.matches?.length ?? "?"}`
);

// ── 5. mutual like creates a Match + match modal ────────────────────────
// userA likes me back
const reciprocal = await jsonReq(
  "/api/swipe",
  { body: { swipeeId: me.id, direction: "like" } },
  userA.token
);
const matchOk =
  reciprocal.status === 200 &&
  reciprocal.body?.isMatch === true &&
  reciprocal.body?.match?.otherUser?.id === me.id;
record(
  "5. Mutual like creates a Match record and returns isMatch:true",
  matchOk,
  `status=${reciprocal.status}, isMatch=${reciprocal.body?.isMatch}, otherUser=${reciprocal.body?.match?.otherUser?.id}`
);

// ── 8. /api/matches returns the new match ───────────────────────────────
const myMatchesAfter = await jsonReq("/api/matches", { method: "GET" }, me.token);
const list = myMatchesAfter.body?.matches || [];
const found = list.find((m) => m.otherUser?.id === userA.id);
record(
  "8. GET /api/matches returns correct list of matches",
  myMatchesAfter.status === 200 && !!found && found.lastMessage === null,
  `count=${list.length}, found A=${!!found}, lastMessage=${found?.lastMessage}`
);

// ── 7. empty-state: another fresh user with no one to swipe on ──────────
// We'll register a new user, swipe everyone we discover, then expect zero.
const drainer = await register("drain");
let safety = 20;
while (safety-- > 0) {
  const d = await jsonReq("/api/discover", { method: "GET" }, drainer.token);
  const u = d.body?.users || [];
  if (u.length === 0) break;
  for (const target of u) {
    await jsonReq(
      "/api/swipe",
      { body: { swipeeId: target.id, direction: "pass" } },
      drainer.token
    );
  }
}
const finalDisc = await jsonReq("/api/discover", { method: "GET" }, drainer.token);
record(
  "7. Empty state shows when no more users to discover",
  finalDisc.status === 200 && (finalDisc.body?.users?.length ?? -1) === 0,
  `final user count = ${finalDisc.body?.users?.length}`
);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
