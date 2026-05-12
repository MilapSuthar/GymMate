#!/usr/bin/env node
/**
 * Tests the Trainer Portal against 9 checks:
 *   1. POST /api/trainer/register creates a TrainerProfile
 *   2. Duplicate register returns 409
 *   3. GET /api/trainer/profile returns own profile
 *   4. PUT /api/trainer/profile updates price and tags
 *   5. Trainer's profile is visible in GET /api/trainers listing
 *   6. Client books → booking appears in GET /api/trainer/bookings
 *   7. PATCH /api/trainer/bookings/[id] confirms a booking
 *   8. PATCH /api/trainer/bookings/[id] completes a booking
 *   9. Another trainer cannot update someone else's booking (403/404)
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
  const email = `portal+${suffix}+${Date.now()}@gymmate.dev`;
  const r = await jsonReq("/api/auth/register", {
    body: { name: `User ${suffix.toUpperCase()}`, email, password: "Password123!" },
  });
  if (r.status !== 201) { console.error("Register failed", r); process.exit(1); }
  return { token: r.body.accessToken, id: r.body.user.id, email };
}

const trainer = await register("trainer");
const client = await register("client");
const otherTrainer = await register("trainer2");

// ── 1. Register as trainer ───────────────────────────────────────────────────
const regRes = await jsonReq(
  "/api/trainer/register",
  {
    body: {
      specialty: "Strength & Conditioning",
      bio: "Former competitive powerlifter with 5 years PT experience.",
      pricePerSession: 50,
      certifications: "REPS Level 3",
      tags: "Powerlifting,Beginners",
      gymName: "Test Gym",
    },
  },
  trainer.token
);
const trainerProfile = regRes.body?.trainer;
record(
  "1. POST /api/trainer/register creates a TrainerProfile",
  regRes.status === 201 && !!trainerProfile?.id && trainerProfile?.specialty === "Strength & Conditioning",
  `status=${regRes.status}, id=${trainerProfile?.id}`
);

// ── 2. Duplicate register returns 409 ────────────────────────────────────────
const dupRes = await jsonReq(
  "/api/trainer/register",
  { body: { specialty: "Other", bio: "Duplicate", pricePerSession: 30 } },
  trainer.token
);
record(
  "2. Duplicate register returns 409",
  dupRes.status === 409,
  `status=${dupRes.status}`
);

// ── 3. GET own trainer profile ───────────────────────────────────────────────
const profileRes = await jsonReq("/api/trainer/profile", {}, trainer.token);
const p = profileRes.body?.trainer;
record(
  "3. GET /api/trainer/profile returns own profile",
  profileRes.status === 200 &&
    p?.specialty === "Strength & Conditioning" &&
    p?.pricePerSession === 50 &&
    Array.isArray(p?.tags) &&
    p?.tags.includes("Powerlifting"),
  `specialty="${p?.specialty}", price=${p?.pricePerSession}, tags=${p?.tags?.join(",")}`
);

// ── 4. PUT updates profile ───────────────────────────────────────────────────
const updateRes = await jsonReq(
  "/api/trainer/profile",
  { method: "PUT", body: { pricePerSession: 60, tags: "Powerlifting,Advanced,Beginners" } },
  trainer.token
);
const updated = updateRes.body?.trainer;
record(
  "4. PUT /api/trainer/profile updates price and tags",
  updateRes.status === 200 &&
    updated?.pricePerSession === 60 &&
    updated?.tags?.includes("Advanced"),
  `price=${updated?.pricePerSession}, tags=${updated?.tags?.join(",")}`
);

// ── 5. Trainer visible in public listing ─────────────────────────────────────
const listRes = await jsonReq("/api/trainers", {}, client.token);
const allTrainers = listRes.body?.trainers ?? [];
const found = allTrainers.find((t) => t.id === trainerProfile?.id);
record(
  "5. Trainer's profile is visible in GET /api/trainers listing",
  listRes.status === 200 && !!found,
  `totalTrainers=${allTrainers.length}, foundNewTrainer=${!!found}`
);

// ── 6. Client books → appears in trainer bookings ────────────────────────────
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(14, 0, 0, 0);

const bookRes = await jsonReq(
  `/api/trainers/${trainerProfile?.id}/book`,
  {
    body: {
      scheduledAt: tomorrow.toISOString(),
      durationMins: 60,
      notes: "First session — want to improve squat form",
    },
  },
  client.token
);
const booking = bookRes.body?.booking;

const trainerBookingsRes = await jsonReq("/api/trainer/bookings", {}, trainer.token);
const trainerBookings = trainerBookingsRes.body?.bookings ?? [];
const myBooking = trainerBookings.find((b) => b.id === booking?.id);
record(
  "6. Client books a session → appears in GET /api/trainer/bookings",
  bookRes.status === 201 &&
    trainerBookingsRes.status === 200 &&
    !!myBooking &&
    myBooking?.status === "pending",
  `bookingId=${booking?.id}, trainerSees=${!!myBooking}, status=${myBooking?.status}`
);

// ── 7. Trainer confirms booking ──────────────────────────────────────────────
const confirmRes = await jsonReq(
  `/api/trainer/bookings/${booking?.id}`,
  { method: "PATCH", body: { status: "confirmed" } },
  trainer.token
);
record(
  "7. PATCH confirms a booking (pending → confirmed)",
  confirmRes.status === 200 && confirmRes.body?.booking?.status === "confirmed",
  `status=${confirmRes.status}, newStatus=${confirmRes.body?.booking?.status}`
);

// ── 8. Trainer marks as completed ────────────────────────────────────────────
const completeRes = await jsonReq(
  `/api/trainer/bookings/${booking?.id}`,
  { method: "PATCH", body: { status: "completed" } },
  trainer.token
);
record(
  "8. PATCH completes a booking (confirmed → completed)",
  completeRes.status === 200 && completeRes.body?.booking?.status === "completed",
  `status=${completeRes.status}, newStatus=${completeRes.body?.booking?.status}`
);

// ── 9. Another trainer cannot update the booking ─────────────────────────────
// First register otherTrainer as a trainer
await jsonReq(
  "/api/trainer/register",
  { body: { specialty: "HIIT & Functional Fitness", bio: "Competitor", pricePerSession: 40 } },
  otherTrainer.token
);
const intruderRes = await jsonReq(
  `/api/trainer/bookings/${booking?.id}`,
  { method: "PATCH", body: { status: "cancelled" } },
  otherTrainer.token
);
record(
  "9. Another trainer cannot update someone else's booking (404)",
  intruderRes.status === 404,
  `status=${intruderRes.status}`
);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
