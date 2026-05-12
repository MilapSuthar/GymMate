#!/usr/bin/env node
/**
 * Tests the Exercise Library feature against the 8 milestones:
 *   1. Seed script populated 30+ exercises in the DB
 *   2. GET /api/exercises returns real exercises from DB
 *   3. Filter by muscleGroup returns only matching exercises
 *   4. Filter by category (push/pull/legs/cardio) works correctly
 *   5. GET /api/exercises/[id] returns description + videoUrl
 *   6. POST /api/workouts creates WorkoutLog + WorkoutSet rows
 *   7. GET /api/exercises/[id]/pr returns updated PR after a new best
 *   8. GET /api/workouts returns workout history for current user only
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
  const email = `exercise+${suffix}+${Date.now()}@gymmate.dev`;
  const r = await jsonReq("/api/auth/register", {
    body: { name: `Lifter ${suffix.toUpperCase()}`, email, password: "Password123!" },
  });
  if (r.status !== 201) { console.error("Register failed", r); process.exit(1); }
  return { token: r.body.accessToken, id: r.body.user.id };
}

const me = await register("me");
const other = await register("other");

// ── 1. Seed: 30+ exercises exist ────────────────────────────────────────
const all = await jsonReq("/api/exercises", {}, me.token);
const exercises = all.body?.exercises ?? [];
record(
  "1. Seed script populated 30+ exercises in the DB",
  all.status === 200 && exercises.length >= 30,
  `count=${exercises.length}`
);

// ── 2. GET /api/exercises returns real exercises ─────────────────────────
const hasFields = exercises.every(
  (e) => e.id && e.name && e.muscleGroup && e.category
);
record(
  "2. GET /api/exercises returns real exercises with required fields",
  all.status === 200 && hasFields && exercises.length > 0,
  `count=${exercises.length}, allHaveFields=${hasFields}`
);

// ── 3. Filter by muscleGroup ─────────────────────────────────────────────
const chestRes = await jsonReq("/api/exercises?muscleGroup=chest", {}, me.token);
const chestList = chestRes.body?.exercises ?? [];
const allChest = chestList.every((e) => e.muscleGroup === "chest");
record(
  "3. Filter by muscleGroup returns only matching exercises",
  chestRes.status === 200 && chestList.length > 0 && allChest,
  `returned=${chestList.length}, allChest=${allChest}`
);

// ── 4. Filter by category (push) ─────────────────────────────────────────
const pushRes = await jsonReq("/api/exercises?category=push", {}, me.token);
const pushList = pushRes.body?.exercises ?? [];
const allPush = pushList.every((e) => e.category === "push");
record(
  "4. Filter by category (push/pull/legs/cardio) works correctly",
  pushRes.status === 200 && pushList.length > 0 && allPush,
  `returned=${pushList.length}, allPush=${allPush}`
);

// ── 5. GET /api/exercises/[id] returns description + videoUrl ────────────
const sampleId = exercises[0]?.id;
const detailRes = await jsonReq(`/api/exercises/${sampleId}`, {}, me.token);
const ex = detailRes.body?.exercise;
record(
  "5. Exercise detail page shows description and video placeholder",
  detailRes.status === 200 &&
    typeof ex?.description === "string" &&
    ex.description.length > 0 &&
    typeof ex?.videoUrl === "string" &&
    ex.videoUrl.startsWith("https://"),
  `name="${ex?.name}", desc=${ex?.description?.length}chars, videoUrl="${ex?.videoUrl?.slice(0, 40)}"`
);

// ── 6. POST /api/workouts creates WorkoutLog + WorkoutSet ─────────────────
const logRes = await jsonReq(
  "/api/workouts",
  {
    body: {
      exerciseId: sampleId,
      notes: "Test session",
      sets: [
        { weightKg: 80, reps: 8 },
        { weightKg: 82.5, reps: 6 },
        { weightKg: 85, reps: 4 },
      ],
    },
  },
  me.token
);
const workout = logRes.body?.workout;
record(
  "6. Logging a set saves WorkoutLog + WorkoutSet rows to DB",
  logRes.status === 201 &&
    !!workout?.id &&
    Array.isArray(workout?.sets) &&
    workout.sets.length === 3,
  `status=${logRes.status}, id=${workout?.id}, sets=${workout?.sets?.length}`
);

// ── 7. PR updates after logging a new best ────────────────────────────────
// First PR: best volume = 85 × 4 = 340
const pr1 = await jsonReq(`/api/exercises/${sampleId}/pr`, {}, me.token);
const hasPr1 =
  pr1.status === 200 && pr1.body?.pr !== null && pr1.body?.pr?.weightKg > 0;

// Log a new best (90kg × 10 = 900 volume — clearly better)
await jsonReq(
  "/api/workouts",
  { body: { exerciseId: sampleId, sets: [{ weightKg: 90, reps: 10 }] } },
  me.token
);

const pr2 = await jsonReq(`/api/exercises/${sampleId}/pr`, {}, me.token);
const prImproved =
  pr2.status === 200 &&
  pr2.body?.pr?.weightKg === 90 &&
  pr2.body?.pr?.reps === 10;

record(
  "7. Personal record updates when a new best is logged",
  hasPr1 && prImproved,
  `pr1=${pr1.body?.pr?.weightKg}kg×${pr1.body?.pr?.reps}, pr2=${pr2.body?.pr?.weightKg}kg×${pr2.body?.pr?.reps}`
);

// ── 8. Workout history is user-scoped ────────────────────────────────────
// other user logs a workout — should not appear in me's history
await jsonReq(
  "/api/workouts",
  { body: { exerciseId: sampleId, sets: [{ weightKg: 50, reps: 5 }] } },
  other.token
);

const myHistory = await jsonReq("/api/workouts", {}, me.token);
const myLogs = myHistory.body?.workouts ?? [];
const otherHistory = await jsonReq("/api/workouts", {}, other.token);
const otherLogs = otherHistory.body?.workouts ?? [];

record(
  "8. Workout history shows only current user's sessions",
  myHistory.status === 200 &&
    myLogs.length === 2 &&          // me logged twice above
    otherLogs.length === 1 &&       // other logged once
    myLogs.every((w) => w.sets.every((s) => s.exercise?.id === sampleId || s.exercise)),
  `myLogs=${myLogs.length}, otherLogs=${otherLogs.length}`
);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
