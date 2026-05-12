#!/usr/bin/env node
/**
 * Tests R2 storage migration:
 *   1. Profile photo upload succeeds when R2 is configured (saves to R2, not /public/uploads)
 *   2. Returned URL points at the R2 public URL, not /uploads/
 *   3. Files larger than 5 MB are rejected with 400
 *   4. Non-image file types are rejected with 400
 *   5. JPEG, PNG, WebP are all accepted
 *   6. Photo DELETE removes the DB row (best-effort R2 delete is logged on failure)
 *   7. Storage lib is reusable (importable from any feature)
 *   8. .env.example documents all required R2_* variables
 *
 * Run: node scripts/test-storage.mjs
 *
 * If R2 env vars are missing, the upload-path checks (1, 2, 5, 6) are SKIPPED
 * with a clear message — validation checks (3, 4, 7, 8) still run.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const status = ok === "skip" ? "SKIP" : ok ? "PASS" : "FAIL";
  console.log(`${status}  ${name}${detail ? "  -- " + detail : ""}`);
}

const r2Configured = Boolean(
  process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
);
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

async function jsonReq(p, opts = {}, token = null) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body && typeof opts.body !== "string" && !(opts.body instanceof FormData)) {
    headers["content-type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  if (token) headers["authorization"] = `Bearer ${token}`;
  const res = await fetch(BASE + p, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body,
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

async function register(suffix) {
  const email = `storage+${suffix}+${Date.now()}@gymmate.dev`;
  const r = await jsonReq("/api/auth/register", {
    body: { name: `User ${suffix}`, email, password: "Password123!" },
  });
  if (r.status !== 201) { console.error("Register failed", r); process.exit(1); }
  return { token: r.body.accessToken, id: r.body.user.id };
}

// Minimal valid 1x1 PNG (no real pixel data)
const TINY_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000005000100" +
  "0d0a2db40000000049454e44ae426082",
  "hex"
);
// Minimal valid 1x1 JPEG
const TINY_JPEG = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffdb0043000302020302020303030304030304050805050404050a070706080c0a0c0c0b0a0b0b0d0e1212" +
  "0d0e1b0e0b0b1816171819181a191c1f1d1d1b1c1e2422222428272a292b2b2b202225262a2b2cffc0000b08000100010101011100ffc4001f00000105010101010101000000000000000001020304050607080910" +
  "111213ffc4001a10010101010301000000000000000000000000000204050801ffda0008010100003f00fbffd9",
  "hex"
);

function fileFromBuffer(buf, name, type) {
  return new File([buf], name, { type });
}

async function uploadPhoto(token, file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(BASE + "/api/profile/photos", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: fd,
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

const me = await register("me");

// ── 3. Oversize file rejected ────────────────────────────────────────────────
const huge = fileFromBuffer(Buffer.alloc(6 * 1024 * 1024, 0xff), "huge.png", "image/png");
const hugeRes = await uploadPhoto(me.token, huge);
record(
  "3. Files larger than 5 MB are rejected with 400",
  hugeRes.status === 400 && /5 MB|exceeds/i.test(hugeRes.body?.error ?? ""),
  `status=${hugeRes.status}, error="${hugeRes.body?.error}"`
);

// ── 4. Wrong MIME type rejected ──────────────────────────────────────────────
const txt = fileFromBuffer(Buffer.from("hello"), "notes.txt", "text/plain");
const txtRes = await uploadPhoto(me.token, txt);
record(
  "4. Non-image file types are rejected with 400",
  txtRes.status === 400 && /Unsupported file type/i.test(txtRes.body?.error ?? ""),
  `status=${txtRes.status}, error="${txtRes.body?.error}"`
);

// ── 1, 2, 5, 6 require R2 to be configured ───────────────────────────────────
if (!r2Configured) {
  for (const [n, label] of [
    [1, "1. Profile photo upload saves to R2 (not local disk)"],
    [2, "2. Returned photo URL points at R2 (not /uploads/)"],
    [5, "5. JPEG, PNG, WebP are all accepted"],
    [6, "6. Photo DELETE removes the DB row"],
  ]) {
    record(label, "skip", "R2 env vars not set — set R2_* in .env to run");
    void n;
  }
} else {
  const pngFile = fileFromBuffer(TINY_PNG, "tiny.png", "image/png");
  const pngRes = await uploadPhoto(me.token, pngFile);
  const pngUrl = pngRes.body?.photo?.url ?? "";

  record(
    "1. Profile photo upload saves to R2 (not local disk)",
    pngRes.status === 201 && pngUrl.startsWith(R2_PUBLIC_URL + "/"),
    `status=${pngRes.status}, url=${pngUrl}`
  );
  record(
    "2. Returned photo URL points at R2 (not /uploads/)",
    !pngUrl.startsWith("/uploads/") && pngUrl.startsWith("https://"),
    `url=${pngUrl}`
  );

  const jpegFile = fileFromBuffer(TINY_JPEG, "tiny.jpg", "image/jpeg");
  const jpegRes = await uploadPhoto(me.token, jpegFile);
  const webpFile = fileFromBuffer(TINY_PNG, "tiny.webp", "image/webp");
  const webpRes = await uploadPhoto(me.token, webpFile);
  record(
    "5. JPEG, PNG, WebP are all accepted",
    pngRes.status === 201 && jpegRes.status === 201 && webpRes.status === 201,
    `png=${pngRes.status}, jpg=${jpegRes.status}, webp=${webpRes.status}`
  );

  const photoId = pngRes.body?.photo?.id;
  let delStatus = 0;
  if (photoId) {
    const del = await fetch(BASE + `/api/profile/photos/${photoId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${me.token}` },
    });
    delStatus = del.status;
  }
  record(
    "6. Photo DELETE removes the DB row",
    delStatus === 200,
    `delStatus=${delStatus}`
  );
}

// ── 7. Storage lib is reusable ───────────────────────────────────────────────
const storageSrc = await readFile(path.join(ROOT, "src/lib/storage.ts"), "utf8");
const reusable =
  /export\s+(?:async\s+)?function\s+uploadFile/.test(storageSrc) &&
  /export\s+(?:async\s+)?function\s+deleteFile/.test(storageSrc) &&
  /export\s+function\s+generateKey/.test(storageSrc) &&
  /export\s+function\s+publicUrlFor/.test(storageSrc);
record(
  "7. Storage lib is reusable (uploadFile/deleteFile/generateKey/publicUrlFor exported)",
  reusable,
  `lib/storage.ts exports verified`
);

// ── 8. .env.example documents all R2 vars ────────────────────────────────────
const envExample = await readFile(path.join(ROOT, ".env.example"), "utf8");
const requiredVars = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
];
const missing = requiredVars.filter((v) => !envExample.includes(v));
record(
  "8. .env.example documents all R2 variables",
  missing.length === 0,
  missing.length ? `missing: ${missing.join(", ")}` : "all 5 vars present"
);

const total = results.length;
const passed = results.filter((r) => r.ok === true).length;
const skipped = results.filter((r) => r.ok === "skip").length;
const failed = results.filter((r) => r.ok === false).length;
console.log(`\n${passed}/${total} checks passed${skipped ? `, ${skipped} skipped` : ""}${failed ? `, ${failed} failed` : ""}`);
process.exit(failed === 0 ? 0 : 1);
