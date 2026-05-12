#!/usr/bin/env node
/**
 * Tests the Nutrition feature against 8 milestones:
 *   1. Nutrition page shows real macro totals for today (zero when no logs)
 *   2. Log food form saves entry to DB
 *   3. Multiple entries in a day accumulate correctly
 *   4. Calorie ring / macro bars update after logging (totals reflect new entry)
 *   5. Meal plans load from DB (seeded data — 5 plans expected)
 *   6. Buy button records a MealPlanPurchase in DB
 *   7. Purchased plans show as purchased=true in GET /api/nutrition/meal-plans
 *   8. Totals reset to zero for a new day (date param)
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
  const email = `nutrition+${suffix}+${Date.now()}@gymmate.dev`;
  const r = await jsonReq("/api/auth/register", {
    body: { name: `Lifter ${suffix.toUpperCase()}`, email, password: "Password123!" },
  });
  if (r.status !== 201) { console.error("Register failed", r); process.exit(1); }
  return { token: r.body.accessToken, id: r.body.user.id };
}

const me = await register("me");
const other = await register("other");

// ── 1. Totals start at zero ──────────────────────────────────────────────────
const emptyRes = await jsonReq("/api/nutrition/log", {}, me.token);
const totals0 = emptyRes.body?.totals;
record(
  "1. Nutrition page shows real macro totals for today (zero initially)",
  emptyRes.status === 200 &&
    totals0?.calories === 0 &&
    totals0?.protein === 0 &&
    totals0?.carbs === 0 &&
    totals0?.fats === 0,
  `cal=${totals0?.calories}, p=${totals0?.protein}, c=${totals0?.carbs}, f=${totals0?.fats}`
);

// ── 2. Log food saves entry ───────────────────────────────────────────────────
const logRes = await jsonReq(
  "/api/nutrition/log",
  {
    body: {
      name: "Chicken breast 200g",
      mealType: "lunch",
      calories: 330,
      protein: 62,
      carbs: 0,
      fats: 7,
    },
  },
  me.token
);
const entry = logRes.body?.entry;
record(
  "2. Log food form saves entry to DB",
  logRes.status === 201 &&
    !!entry?.id &&
    entry?.calories === 330 &&
    entry?.name === "Chicken breast 200g" &&
    entry?.mealType === "lunch",
  `status=${logRes.status}, id=${entry?.id}, name="${entry?.name}"`
);

// ── 3. Multiple entries accumulate ───────────────────────────────────────────
await jsonReq(
  "/api/nutrition/log",
  { body: { name: "White rice 150g", mealType: "lunch", calories: 195, protein: 4, carbs: 43, fats: 0.5 } },
  me.token
);
await jsonReq(
  "/api/nutrition/log",
  { body: { name: "Olive oil 1 tbsp", mealType: "lunch", calories: 120, protein: 0, carbs: 0, fats: 14 } },
  me.token
);

const accumulated = await jsonReq("/api/nutrition/log", {}, me.token);
const totals3 = accumulated.body?.totals;
const expectedCal = 330 + 195 + 120;
record(
  "3. Multiple entries in a day accumulate correctly",
  accumulated.status === 200 && totals3?.calories === expectedCal,
  `expected=${expectedCal}, got=${totals3?.calories}`
);

// ── 4. Totals reflect the logged entries ─────────────────────────────────────
const expectedProtein = 62 + 4 + 0;
record(
  "4. Calorie ring and macro bars update after logging (totals correct)",
  totals3?.protein >= expectedProtein - 1 && totals3?.protein <= expectedProtein + 1,
  `expected protein~=${expectedProtein}, got=${totals3?.protein}`
);

// ── 5. Meal plans load from DB ───────────────────────────────────────────────
const plansRes = await jsonReq("/api/nutrition/meal-plans", {}, me.token);
const plans = plansRes.body?.plans ?? [];
const allHaveFields = plans.every(
  (p) =>
    p.id && p.title && p.caloriesPerDay > 0 && typeof p.price === "number" && p.dietitian
);
record(
  "5. Meal plans load from DB (5 seeded plans)",
  plansRes.status === 200 && plans.length >= 5 && allHaveFields,
  `count=${plans.length}, allHaveFields=${allHaveFields}`
);

// ── 6. Buy button records a MealPlanPurchase ─────────────────────────────────
const planToBuy = plans[0];
const buyRes = await jsonReq(
  `/api/nutrition/meal-plans/${planToBuy.id}/purchase`,
  { method: "POST" },
  me.token
);
record(
  "6. Buy button records a MealPlanPurchase in DB",
  buyRes.status === 201 && !!buyRes.body?.purchase?.id,
  `status=${buyRes.status}, purchaseId=${buyRes.body?.purchase?.id}`
);

// ── 7. Purchased plan shows purchased=true ───────────────────────────────────
const plansAfterBuy = await jsonReq("/api/nutrition/meal-plans", {}, me.token);
const boughtPlan = plansAfterBuy.body?.plans?.find((p) => p.id === planToBuy.id);
const otherPlansBought = plansAfterBuy.body?.plans?.filter(
  (p) => p.id !== planToBuy.id && p.purchased
);
record(
  "7. Purchased plans show purchased=true (others remain false)",
  boughtPlan?.purchased === true && otherPlansBought?.length === 0,
  `boughtPlan.purchased=${boughtPlan?.purchased}, otherBought=${otherPlansBought?.length}`
);

// ── 8. Totals reset to zero for a different day ──────────────────────────────
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yStr = yesterday.toISOString().split("T")[0];
const yesterdayRes = await jsonReq(`/api/nutrition/log?date=${yStr}`, {}, me.token);
const totalsYest = yesterdayRes.body?.totals;
record(
  "8. Totals reset to zero for a new day",
  yesterdayRes.status === 200 &&
    totalsYest?.calories === 0 &&
    totalsYest?.protein === 0,
  `cal=${totalsYest?.calories}, protein=${totalsYest?.protein}`
);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
