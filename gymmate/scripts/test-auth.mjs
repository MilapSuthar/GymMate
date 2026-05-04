#!/usr/bin/env node
/**
 * End-to-end auth test suite. Exercises every milestone:
 *   1. POST /auth/register creates user and returns tokens
 *   2. POST /auth/login returns access + refresh tokens
 *   3. Incorrect password returns 401
 *   4. Duplicate email returns 409
 *   5. Auth middleware blocks requests without valid token
 *   6. POST /auth/refresh gives new access token
 *   7. POST /auth/logout invalidates refresh token in store
 *   8. Google OAuth flow (best-effort: verifies the route is wired up)
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const tag = ok ? "PASS" : "FAIL";
  console.log(`${tag}  ${name}${detail ? "  -- " + detail : ""}`);
}

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method || "POST",
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

// Use a unique email per run so tests are repeatable
const email = `test+${Date.now()}@gymmate.dev`;
const password = "Password123!";

const reg = await req("/api/auth/register", { body: { name: "Test User", email, password } });
record(
  "1. POST /auth/register creates user and returns tokens",
  reg.status === 201 && !!reg.body?.accessToken && !!reg.body?.refreshToken && reg.body?.user?.email === email,
  `status=${reg.status}`
);

const login = await req("/api/auth/login", { body: { email, password } });
record(
  "2. POST /auth/login returns access + refresh tokens",
  login.status === 200 && !!login.body?.accessToken && !!login.body?.refreshToken,
  `status=${login.status}`
);

const wrongPw = await req("/api/auth/login", { body: { email, password: "wrong-password-xyz" } });
record(
  "3. Incorrect password returns 401",
  wrongPw.status === 401,
  `status=${wrongPw.status}, msg="${wrongPw.body?.error || ""}"`
);

const dup = await req("/api/auth/register", { body: { name: "Dup", email, password } });
record(
  "4. Duplicate email registration returns 409",
  dup.status === 409,
  `status=${dup.status}, msg="${dup.body?.error || ""}"`
);

const noAuth = await req("/api/me", { method: "GET", body: undefined });
const badAuth = await req("/api/me", { method: "GET", headers: { authorization: "Bearer not-a-real-token" } });
record(
  "5. Auth middleware blocks requests without valid token",
  noAuth.status === 401 && badAuth.status === 401,
  `noHeader=${noAuth.status}, badToken=${badAuth.status}`
);

const goodAuth = await req("/api/me", { method: "GET", headers: { authorization: `Bearer ${login.body.accessToken}` } });
const middlewarePassesValid = goodAuth.status === 200 && goodAuth.body?.user?.email === email;

const refresh = await req("/auth/refresh-typo".replace("/auth/refresh-typo", "/api/auth/refresh"), { body: { refreshToken: login.body.refreshToken } });
record(
  "6. POST /auth/refresh gives new access token",
  refresh.status === 200 && !!refresh.body?.accessToken && refresh.body.accessToken !== login.body.accessToken,
  `status=${refresh.status}`
);

// 7. Logout invalidates the (newly issued) refresh token
const logout = await req("/api/auth/logout", { body: { refreshToken: refresh.body.refreshToken } });
const refreshAfterLogout = await req("/api/auth/refresh", { body: { refreshToken: refresh.body.refreshToken } });
record(
  "7. POST /auth/logout invalidates refresh token in store",
  logout.status === 200 && refreshAfterLogout.status === 401,
  `logout=${logout.status}, postLogoutRefresh=${refreshAfterLogout.status}`
);

// 8. Google OAuth — without real Firebase credentials we can only verify the
// route exists, parses input, and rejects an invalid token with 401.
const google = await req("/api/auth/google", { body: { idToken: "definitely-not-a-real-google-token" } });
const googleRouteWired = google.status === 401 || google.status === 400;
record(
  "8. POST /auth/google route wired (rejects invalid token)",
  googleRouteWired,
  `status=${google.status}, msg="${google.body?.error || ""}"  (full E2E requires Firebase credentials)`
);

// Bonus: middleware lets valid token through
record(
  "BONUS. Auth middleware passes valid token through",
  middlewarePassesValid,
  `status=${goodAuth.status}`
);

const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(results.every(r => r.ok) ? 0 : 1);
