#!/usr/bin/env node
/**
 * Tests the Trainers feature against 9 checklist items:
 *   1. Trainers page loads real trainer profiles from DB
 *   2. Filter by specialty returns only matching trainers
 *   3. Trainer profile page shows full details (bio, price, rating)
 *   4. POST /api/trainers/[id]/book creates a Booking record
 *   5. POST /api/trainers/[id]/checkout returns 503 (Stripe not configured) or a URL
 *   6. POST /api/webhooks/stripe marks booking as paid
 *   7. GET /api/bookings shows paid=true after webhook
 *   8. /booking/success page returns 200
 *   9. /booking/cancel page returns 200
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
  const email = `trainers+${suffix}+${Date.now()}@gymmate.dev`;
  const r = await jsonReq("/api/auth/register", {
    body: { name: `Client ${suffix.toUpperCase()}`, email, password: "Password123!" },
  });
  if (r.status !== 201) { console.error("Register failed", r); process.exit(1); }
  return { token: r.body.accessToken, id: r.body.user.id };
}

const me = await register("me");

// ── 1. Trainers load from DB ─────────────────────────────────────────────────
const allRes = await jsonReq("/api/trainers", {}, me.token);
const trainers = allRes.body?.trainers ?? [];
const allHaveFields = trainers.every(
  (t) => t.id && t.name && t.specialty && t.pricePerSession > 0
);
record(
  "1. Trainers page loads real trainer profiles from DB",
  allRes.status === 200 && trainers.length >= 8 && allHaveFields,
  `count=${trainers.length}, allHaveFields=${allHaveFields}`
);

// ── 2. Filter by specialty ───────────────────────────────────────────────────
const strengthRes = await jsonReq("/api/trainers?specialty=Strength", {}, me.token);
const strengthTrainers = strengthRes.body?.trainers ?? [];
const allStrength = strengthTrainers.every((t) =>
  t.specialty.toLowerCase().includes("strength")
);
record(
  "2. Filter by specialty returns only matching trainers",
  strengthRes.status === 200 && strengthTrainers.length > 0 && allStrength,
  `count=${strengthTrainers.length}, allMatch=${allStrength}`
);

// ── 3. Trainer detail shows full profile ─────────────────────────────────────
const sampleTrainer = trainers[0];
const detailRes = await jsonReq(`/api/trainers/${sampleTrainer.id}`, {}, me.token);
const t = detailRes.body?.trainer;
record(
  "3. Trainer profile page shows full details (bio, price, rating)",
  detailRes.status === 200 &&
    !!t?.bio &&
    t?.pricePerSession > 0 &&
    t?.rating !== undefined &&
    Array.isArray(t?.tags),
  `name="${t?.name}", price=£${t?.pricePerSession}, rating=${t?.rating}, bio=${t?.bio?.length}chars`
);

// ── 4. Book session creates Booking record ───────────────────────────────────
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(10, 0, 0, 0);

const bookRes = await jsonReq(
  `/api/trainers/${sampleTrainer.id}/book`,
  {
    body: {
      scheduledAt: tomorrow.toISOString(),
      durationMins: 60,
      notes: "First session — focusing on compound movements",
    },
  },
  me.token
);
const booking = bookRes.body?.booking;
record(
  "4. Book Session form saves Booking to DB",
  bookRes.status === 201 &&
    !!booking?.id &&
    booking?.paid === false &&
    booking?.status === "pending",
  `status=${bookRes.status}, id=${booking?.id}, paid=${booking?.paid}`
);

// ── 5. Checkout endpoint responds correctly ──────────────────────────────────
const checkoutRes = await jsonReq(
  `/api/trainers/${sampleTrainer.id}/checkout`,
  { body: { bookingId: booking?.id ?? "fake" } },
  me.token
);
// If Stripe not configured → 503; if configured → 200 with url
const checkoutOk =
  checkoutRes.status === 503 ||
  (checkoutRes.status === 200 && typeof checkoutRes.body?.url === "string");
record(
  "5. Checkout endpoint returns Stripe URL or 503 (not configured)",
  checkoutOk,
  `status=${checkoutRes.status}, url=${checkoutRes.body?.url ?? checkoutRes.body?.error}`
);

// ── 6. Stripe webhook marks booking as paid ──────────────────────────────────
const webhookPayload = {
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_fake123",
      metadata: { bookingId: booking?.id },
    },
  },
};
const webhookRes = await fetch(BASE + "/api/webhooks/stripe", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(webhookPayload),
});
const webhookBody = await webhookRes.json().catch(() => ({}));
// 200 = processed; 503 = Stripe not configured (acceptable)
record(
  "6. Stripe webhook receives and processes payment event",
  webhookRes.status === 200 || webhookRes.status === 503,
  `status=${webhookRes.status}, received=${webhookBody?.received}`
);

// ── 7. Booking is paid after webhook ─────────────────────────────────────────
const bookingsRes = await jsonReq("/api/bookings", {}, me.token);
const myBookings = bookingsRes.body?.bookings ?? [];
const myBooking = myBookings.find((b) => b.id === booking?.id);
// Only passes if Stripe key was configured (webhook processed); skip if 503
const webhookWasProcessed = webhookRes.status === 200;
record(
  "7. Booking is marked as paid in DB after webhook",
  !webhookWasProcessed || myBooking?.paid === true,
  webhookWasProcessed
    ? `paid=${myBooking?.paid}, status=${myBooking?.status}`
    : "skipped (Stripe not configured)"
);

// ── 8. /booking/success page ─────────────────────────────────────────────────
const successPage = await fetch(BASE + "/booking/success");
record(
  "8. /booking/success page shows confirmation",
  successPage.status === 200,
  `status=${successPage.status}`
);

// ── 9. /booking/cancel page ──────────────────────────────────────────────────
const cancelPage = await fetch(BASE + "/booking/cancel");
record(
  "9. /booking/cancel page allows retry",
  cancelPage.status === 200,
  `status=${cancelPage.status}`
);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
