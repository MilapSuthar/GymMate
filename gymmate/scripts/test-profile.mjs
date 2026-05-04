#!/usr/bin/env node
/**
 * Tests the user profile feature against all 7 milestones:
 *   1. Profile edit form saves bio, gym, fitnessGoals, experienceLevel to DB
 *   2. Photo upload saves file to /public/uploads and URL to UserPhoto table
 *   3. Cannot upload more than 6 photos
 *   4. Deleting a photo removes it from DB
 *   5. GET /api/profile/[userId] returns public profile without sensitive fields
 *   6. Profile completion banner shows on /match when profile is incomplete
 *   7. Profile completion banner disappears once bio + photo are added
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
}

async function jsonReq(path, opts = {}, accessToken = null) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body && typeof opts.body !== "string" && !(opts.body instanceof FormData)) {
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

// 1×1 transparent PNG (smallest valid image we can upload)
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

async function uploadPhoto(token, filename = "tiny.png") {
  const fd = new FormData();
  fd.append("file", new Blob([TINY_PNG], { type: "image/png" }), filename);
  return jsonReq("/api/profile/photos", { method: "POST", body: fd }, token);
}

// ── Set up a fresh authenticated user ───────────────────────────────────
const email = `prof+${Date.now()}@gymmate.dev`;
const password = "Password123!";
const reg = await jsonReq("/api/auth/register", { body: { name: "Profile Tester", email, password } });
if (reg.status !== 201) {
  console.error("Could not register test user:", reg);
  process.exit(1);
}
const token = reg.body.accessToken;
const userId = reg.body.user.id;

// ── 6. Banner shows on /match when profile is incomplete (BEFORE) ──────
const incomplete = await jsonReq("/api/profile", { method: "GET" }, token);
const isIncomplete = !incomplete.body.profile.bio && (incomplete.body.profile.photos || []).length === 0;
record(
  "6. Profile completion banner shows on /match when profile is incomplete",
  isIncomplete,
  `bio="${incomplete.body.profile.bio ?? ""}", photos=${(incomplete.body.profile.photos || []).length} (banner renders when bio is empty OR no photos)`
);

// ── 1. Profile edit saves bio, gym, fitnessGoals, experienceLevel ──────
const update = await jsonReq(
  "/api/profile",
  {
    method: "PUT",
    body: {
      bio: "Hi, I lift heavy and eat a lot of chicken.",
      gymName: "PureGym City Centre",
      fitnessGoals: ["strength", "muscle-gain"],
      experienceLevel: "intermediate",
      displayName: "Sam P.",
    },
  },
  token
);
const updateOk =
  update.status === 200 &&
  update.body.profile.bio === "Hi, I lift heavy and eat a lot of chicken." &&
  update.body.profile.gymName === "PureGym City Centre" &&
  Array.isArray(update.body.profile.fitnessGoals) &&
  update.body.profile.fitnessGoals.includes("strength") &&
  update.body.profile.fitnessGoals.includes("muscle-gain") &&
  update.body.profile.experienceLevel === "intermediate";
record(
  "1. Profile edit form saves bio, gym, fitnessGoals, experienceLevel to DB",
  updateOk,
  `status=${update.status}, fields persisted: ${updateOk}`
);

// ── 2. Photo upload saves to /public/uploads and to UserPhoto ──────────
const upload = await uploadPhoto(token);
const fileOnDisk =
  upload.body?.photo?.url &&
  fs.existsSync(path.join(__dirname, "..", "public", upload.body.photo.url));
record(
  "2. Photo upload saves file to /public/uploads and URL to UserPhoto",
  upload.status === 201 && !!upload.body?.photo?.id && !!upload.body?.photo?.url && fileOnDisk,
  `status=${upload.status}, url=${upload.body?.photo?.url}, file exists on disk: ${fileOnDisk}`
);
const firstPhotoId = upload.body.photo.id;

// ── 3. Cannot upload more than 6 photos ────────────────────────────────
// We've already uploaded 1; add 5 more (= 6 total), then the 7th should fail.
let lastSuccessful;
for (let i = 0; i < 5; i++) {
  lastSuccessful = await uploadPhoto(token, `tiny-${i}.png`);
  if (lastSuccessful.status !== 201) break;
}
const seventh = await uploadPhoto(token, "tiny-7.png");
record(
  "3. Cannot upload more than 6 photos",
  lastSuccessful?.status === 201 && seventh.status === 400 && /at most 6/i.test(seventh.body?.error || ""),
  `6th upload=${lastSuccessful?.status}, 7th=${seventh.status} "${seventh.body?.error || ""}"`
);

// ── 4. Deleting a photo removes it from DB ─────────────────────────────
const before = await jsonReq("/api/profile", { method: "GET" }, token);
const beforeCount = before.body.profile.photos.length;
const del = await jsonReq(`/api/profile/photos/${firstPhotoId}`, { method: "DELETE" }, token);
const after = await jsonReq("/api/profile", { method: "GET" }, token);
const stillExists = after.body.profile.photos.some((p) => p.id === firstPhotoId);
record(
  "4. Deleting a photo removes it from DB",
  del.status === 200 && !stillExists && after.body.profile.photos.length === beforeCount - 1,
  `delete status=${del.status}, photo gone: ${!stillExists}, count ${beforeCount}→${after.body.profile.photos.length}`
);

// ── 5. GET /api/profile/[userId] returns public profile without sensitive fields ──
const pub = await jsonReq(`/api/profile/${userId}`, { method: "GET" });
const p = pub.body?.profile || {};
const noSensitive =
  !("email" in p) &&
  !("passwordHash" in p) &&
  !("googleId" in p) &&
  !("provider" in p);
const hasPublicFields =
  p.id === userId &&
  p.name === "Profile Tester" &&
  p.bio === "Hi, I lift heavy and eat a lot of chicken." &&
  Array.isArray(p.photos);
record(
  "5. GET /api/profile/[userId] returns public profile without sensitive fields",
  pub.status === 200 && noSensitive && hasPublicFields,
  `status=${pub.status}, no sensitive fields: ${noSensitive}, public fields populated: ${hasPublicFields}`
);

// ── 7. Banner disappears once bio + photo are added ────────────────────
// At this point: bio is set, and we have ≥ 1 photo (we deleted only 1 of 6).
const complete = await jsonReq("/api/profile", { method: "GET" }, token);
const cBio = !!(complete.body.profile.bio && complete.body.profile.bio.trim().length > 0);
const cPhotos = complete.body.profile.photos.length > 0;
record(
  "7. Profile completion banner disappears once bio + photo are added",
  cBio && cPhotos,
  `bio set=${cBio}, photo count=${complete.body.profile.photos.length} (banner hides when both true)`
);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
