#!/usr/bin/env node
/**
 * Tests the Help Board feature against the 8 milestones:
 *   1. GET /api/help-board returns paginated questions from DB
 *   2. POST /api/help-board creates a new question (the "Ask" form)
 *   3. The new question appears in the feed immediately
 *   4. GET /api/help-board/[id] returns the full thread with answers
 *   5. POST /api/help-board/[id]/answers persists an answer and surfaces it
 *   6. POST /api/help-board/[id]/like toggles the question like + count
 *   7. POST /api/help-board/answers/[id]/like toggles the answer like + count
 *   8. Author name + photo are populated on every question and answer
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
  const email = `help+${suffix}+${Date.now()}@gymmate.dev`;
  const r = await jsonReq("/api/auth/register", {
    body: { name: `Help Tester ${suffix.toUpperCase()}`, email, password: "Password123!" },
  });
  if (r.status !== 201) {
    console.error("Registration failed for", suffix, r);
    process.exit(1);
  }
  return { token: r.body.accessToken, id: r.body.user.id, email };
}

// ── Set up two fresh users: asker and answerer ──────────────────────────
const asker = await register("asker");
const answerer = await register("answerer");

// Snapshot the existing feed so we can isolate our additions.
const before = await jsonReq("/api/help-board", { method: "GET" }, asker.token);
const beforeIds = new Set((before.body?.questions || []).map((q) => q.id));

// ── 2. POST /api/help-board creates a question ──────────────────────────
const created = await jsonReq(
  "/api/help-board",
  {
    body: {
      title: "What's the best rep range for hypertrophy?",
      content: "I've been doing 5x5 but want to start prioritising size. Suggestions?",
      tags: ["Hypertrophy", "Beginners"],
    },
  },
  asker.token
);
const newQ = created.body?.question;
record(
  "2. Ask form (POST /api/help-board) creates a new question",
  created.status === 201 &&
    !!newQ?.id &&
    newQ.title === "What's the best rep range for hypertrophy?" &&
    Array.isArray(newQ.tags) && newQ.tags.length === 2,
  `status=${created.status}, id=${newQ?.id}, tags=${JSON.stringify(newQ?.tags)}`
);

// ── 1 + 3. GET /api/help-board returns DB rows incl. our new one ────────
const after = await jsonReq("/api/help-board", { method: "GET" }, asker.token);
const allQs = after.body?.questions || [];
const found = allQs.find((q) => q.id === newQ?.id);
record(
  "1. GET /api/help-board returns real questions from DB",
  after.status === 200 && Array.isArray(allQs) && allQs.length > beforeIds.size,
  `status=${after.status}, returned=${allQs.length}, before=${beforeIds.size}`
);
record(
  "3. New question appears in the feed immediately",
  !!found && found.title === newQ.title,
  `found=${!!found}, title="${found?.title}"`
);

// ── 4. GET /api/help-board/[id] returns thread with answers ─────────────
const detail = await jsonReq(
  `/api/help-board/${newQ.id}`,
  { method: "GET" },
  asker.token
);
const detailQ = detail.body?.question;
record(
  "4. GET /api/help-board/[id] returns the full thread",
  detail.status === 200 &&
    detailQ?.id === newQ.id &&
    Array.isArray(detailQ?.answers) &&
    detailQ.answers.length === 0,
  `status=${detail.status}, answers=${detailQ?.answers?.length}`
);

// ── 5. POST an answer; refetch shows it ─────────────────────────────────
const answered = await jsonReq(
  `/api/help-board/${newQ.id}/answers`,
  { body: { content: "8–12 reps at ~70% 1RM is the sweet spot. Progressive overload!" } },
  answerer.token
);
const newA = answered.body?.answer;
const detail2 = await jsonReq(
  `/api/help-board/${newQ.id}`,
  { method: "GET" },
  asker.token
);
const showsAnswer = (detail2.body?.question?.answers || []).some(
  (a) => a.id === newA?.id
);
record(
  "5. Posting an answer saves to DB and shows up in thread",
  answered.status === 201 && !!newA?.id && showsAnswer,
  `post status=${answered.status}, id=${newA?.id}, visible in thread=${showsAnswer}`
);

// ── 6. Like toggle on the question ──────────────────────────────────────
const like1 = await jsonReq(
  `/api/help-board/${newQ.id}/like`,
  {},
  answerer.token
);
const like2 = await jsonReq(
  `/api/help-board/${newQ.id}/like`,
  {},
  answerer.token
);
record(
  "6. Like button on a question toggles and updates count",
  like1.status === 200 &&
    like1.body?.liked === true &&
    like1.body?.likeCount === 1 &&
    like2.status === 200 &&
    like2.body?.liked === false &&
    like2.body?.likeCount === 0,
  `on=${like1.body?.liked}/${like1.body?.likeCount}, off=${like2.body?.liked}/${like2.body?.likeCount}`
);

// ── 7. Like toggle on the answer ────────────────────────────────────────
const aLike1 = await jsonReq(
  `/api/help-board/answers/${newA.id}/like`,
  {},
  asker.token
);
const aLike2 = await jsonReq(
  `/api/help-board/answers/${newA.id}/like`,
  {},
  asker.token
);
record(
  "7. Like button on an answer toggles and updates count",
  aLike1.status === 200 &&
    aLike1.body?.liked === true &&
    aLike1.body?.likeCount === 1 &&
    aLike2.status === 200 &&
    aLike2.body?.liked === false &&
    aLike2.body?.likeCount === 0,
  `on=${aLike1.body?.liked}/${aLike1.body?.likeCount}, off=${aLike2.body?.liked}/${aLike2.body?.likeCount}`
);

// ── 8. Author payload populated on Q + A ────────────────────────────────
const detail3 = await jsonReq(
  `/api/help-board/${newQ.id}`,
  { method: "GET" },
  asker.token
);
const q3 = detail3.body?.question;
const a3 = q3?.answers?.[0];
const qAuthorOk =
  !!q3?.author &&
  typeof q3.author.id === "string" &&
  typeof q3.author.name === "string" &&
  "photoUrl" in q3.author;
const aAuthorOk =
  !!a3?.author &&
  typeof a3.author.id === "string" &&
  typeof a3.author.name === "string" &&
  "photoUrl" in a3.author;
record(
  "8. Author name and photo are populated on every question and answer",
  qAuthorOk && aAuthorOk,
  `qAuthor=${JSON.stringify(q3?.author)}, aAuthor=${JSON.stringify(a3?.author)}`
);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
