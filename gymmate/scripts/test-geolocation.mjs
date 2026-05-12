#!/usr/bin/env node
/**
 * Tests Milestone 10: Geolocation distance filtering for Match & Trainers.
 *   1. PUT /api/profile/location saves coords (returns updated lat/lng)
 *   2. PUT rejects out-of-range coords with 400
 *   3. Discover returns numeric distance once viewer has coords
 *   4. ?maxDistance=5 returns fewer users than ?maxDistance=50
 *   5. A user placed far away is excluded by small maxDistance
 *   6. Viewer with NO coords still sees users (graceful) with distance=null
 *   7. Trainers list returns numeric distance for seeded trainers
 *   8. Trainers ?maxDistance=10 filters out far-away trainers
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

const LONDON = { latitude: 51.5074, longitude: -0.1278 };           // central
const NEW_YORK = { latitude: 40.7128, longitude: -74.0060 };        // ~5,570 km from London

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
  const email = `geo+${suffix}+${Date.now()}@gymmate.dev`;
  const r = await jsonReq("/api/auth/register", {
    body: { name: `Geo ${suffix.toUpperCase()}`, email, password: "Password123!" },
  });
  if (r.status !== 201) { console.error("Register failed", r); process.exit(1); }
  return { token: r.body.accessToken, id: r.body.user.id, email };
}

// Three test users:
//   - viewer (will be placed in London)
//   - localFriend (also London, ~3 km away)
//   - farFriend (placed in New York, ~5,570 km away)
const viewer = await register("viewer");
const localFriend = await register("local");
const farFriend = await register("far");

// Place the two other users on the map BEFORE the viewer fetches discover
await jsonReq("/api/profile/location", {
  method: "PUT",
  body: { latitude: 51.5400, longitude: -0.1426 }, // Camden ~3.6 km from central
}, localFriend.token);

await jsonReq("/api/profile/location", {
  method: "PUT",
  body: NEW_YORK,
}, farFriend.token);

// ── 1. PUT /api/profile/location saves coords ────────────────────────────────
const saveRes = await jsonReq(
  "/api/profile/location",
  { method: "PUT", body: LONDON },
  viewer.token
);
record(
  "1. PUT /api/profile/location saves coords to DB",
  saveRes.status === 200 &&
    Math.abs((saveRes.body?.user?.latitude ?? 0) - LONDON.latitude) < 0.0001 &&
    Math.abs((saveRes.body?.user?.longitude ?? 0) - LONDON.longitude) < 0.0001,
  `status=${saveRes.status}, lat=${saveRes.body?.user?.latitude}, lng=${saveRes.body?.user?.longitude}`
);

// ── 2. PUT rejects out-of-range coords ───────────────────────────────────────
const badRes = await jsonReq(
  "/api/profile/location",
  { method: "PUT", body: { latitude: 200, longitude: 0 } },
  viewer.token
);
record(
  "2. PUT /api/profile/location rejects out-of-range coords with 400",
  badRes.status === 400,
  `status=${badRes.status}`
);

// ── 3. Discover returns numeric distance ─────────────────────────────────────
const discoverRes = await jsonReq("/api/discover", {}, viewer.token);
const discoverUsers = discoverRes.body?.users ?? [];
const localCard = discoverUsers.find((u) => u.id === localFriend.id);
record(
  "3. Match cards show real distance badge once viewer has coords",
  discoverRes.status === 200 &&
    !!localCard &&
    typeof localCard.distance === "number" &&
    localCard.distance > 1 && localCard.distance < 10,
  `localFriend.distance=${localCard?.distance}`
);

// ── 4. Slider narrows results ────────────────────────────────────────────────
const wideRes = await jsonReq("/api/discover?maxDistance=50", {}, viewer.token);
const narrowRes = await jsonReq("/api/discover?maxDistance=5", {}, viewer.token);
const wide = wideRes.body?.users ?? [];
const narrow = narrowRes.body?.users ?? [];
record(
  "4. Distance filter slider changes the discover results",
  narrow.length < wide.length || (narrow.length === 0 && wide.length > 0),
  `wide(50km)=${wide.length}, narrow(5km)=${narrow.length}`
);

// ── 5. Far user excluded ─────────────────────────────────────────────────────
const farInNarrow = narrow.some((u) => u.id === farFriend.id);
const farInWide = wide.some((u) => u.id === farFriend.id);
record(
  "5. Users outside selected radius are excluded",
  !farInNarrow && !farInWide, // ~5,570 km — way outside both
  `farFriend in narrow=${farInNarrow}, in wide=${farInWide}`
);

// ── 6. Viewer with no coords sees users with distance=null ───────────────────
const noCoordsViewer = await register("nocoords");
const noCoordsDiscover = await jsonReq("/api/discover", {}, noCoordsViewer.token);
const noCoordsUsers = noCoordsDiscover.body?.users ?? [];
const allNull = noCoordsUsers.length > 0 && noCoordsUsers.every((u) => u.distance === null);
record(
  "6. Denying location degrades gracefully (all users, distance=null)",
  noCoordsDiscover.status === 200 && allNull,
  `count=${noCoordsUsers.length}, allDistanceNull=${allNull}`
);

// ── 7. Trainer cards show distance ───────────────────────────────────────────
const trainersRes = await jsonReq("/api/trainers", {}, viewer.token);
const trainers = trainersRes.body?.trainers ?? [];
const trainersWithDistance = trainers.filter((t) => typeof t.distance === "number");
record(
  "7. Trainer cards show distance from current user",
  trainersRes.status === 200 && trainersWithDistance.length >= 4,
  `total=${trainers.length}, withDistance=${trainersWithDistance.length}`
);

// ── 8. Trainer distance filter ───────────────────────────────────────────────
const nearTrainersRes = await jsonReq("/api/trainers?maxDistance=10", {}, viewer.token);
const farTrainersRes = await jsonReq("/api/trainers?maxDistance=50", {}, viewer.token);
const nearTrainers = nearTrainersRes.body?.trainers ?? [];
const farTrainers = farTrainersRes.body?.trainers ?? [];
record(
  "8. Trainer distance filter works correctly",
  nearTrainers.length > 0 &&
    nearTrainers.length < farTrainers.length &&
    nearTrainers.every((t) => t.distance != null && t.distance <= 10),
  `near(10km)=${nearTrainers.length}, far(50km)=${farTrainers.length}`
);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
