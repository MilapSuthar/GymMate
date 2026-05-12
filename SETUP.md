# GymMate — Setup & Access Guide

This document covers everything needed to:
1. Get GymMate running on a laptop from scratch
2. Access it from a phone (3 options, easiest → most permanent)
3. Optionally connect a Claude Code remote session from a phone

If you're handing this to a developer / AI assistant, they can follow it top to bottom.

---

## 0 · What you'll be running

GymMate is a **Next.js 15** web app written in TypeScript, backed by **Prisma + SQLite** in dev. The codebase lives under `gymmate/` inside the repo. Everything in this guide assumes you're working from that subdirectory unless stated otherwise.

**Repo:** https://github.com/MilapSuthar/GymMate
**Active branch:** `Milap`

---

## 1 · Prerequisites

Install once. Versions are what was used to build the project — newer minors are fine, but **don't upgrade to Prisma 7**, it breaks the schema.

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 LTS | https://nodejs.org/ |
| npm | ≥ 10 | comes with Node |
| Git | any recent | https://git-scm.com/ |
| (optional) GitHub CLI | any | `winget install GitHub.cli` (Windows) / `brew install gh` (macOS) |

Verify:
```bash
node --version    # v20.x or higher
npm --version
git --version
```

---

## 2 · Get the code

```bash
git clone https://github.com/MilapSuthar/GymMate.git
cd GymMate
git checkout Milap     # active dev branch — has the most recent features
cd gymmate             # the actual Next.js app lives here
```

---

## 3 · Install dependencies

```bash
npm install
```

This pulls everything in `package.json` (Next.js, Prisma, Tailwind, shadcn/ui, Firebase, etc.). Takes 1–3 minutes.

---

## 4 · Environment variables

```bash
cp .env.example .env
```

Then open `.env` and fill in. The minimum needed to **run locally** is just two things:

```env
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET="any-long-random-string-32-chars-or-more"
JWT_REFRESH_SECRET="another-different-long-random-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Everything else (Firebase, Redis) is **optional** — features that depend on those vars will be disabled until they're set. The full list with setup instructions is in `.env.example`.

### Generate the JWT secrets

Anything random and long works. One quick way:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run that twice, paste each output into one of the two `JWT_*_SECRET` vars.

---

## 5 · Create the database

```bash
npx prisma migrate deploy
npx prisma generate
```

This creates `prisma/dev.db` (SQLite) with all tables and indexes, and generates the Prisma TypeScript client. Re-run `prisma migrate deploy` any time the schema changes.

---

## 6 · Start the dev server

```bash
npm run dev
```

Open http://localhost:3000 — you should see the login page.

Create your first account by clicking "Create an account" and registering. The app then drops you on the Match page.

---

## 7 · Run the tests (recommended)

While the dev server is running, in a second terminal:

```bash
node scripts/test-auth.mjs       # 9 auth-system checks
node scripts/test-match.mjs      # 8 match/swipe checks
node scripts/test-profile.mjs    # 7 profile + photo checks
node scripts/test-messages.mjs   # 8 chat/SSE checks
```

All four suites should pass cleanly (32/32 total). If any fail, the dev server isn't fully up or env vars are missing — check the output for the specific failure.

---

## 8 · (Optional) Turn on Google / Apple sign-in

Both providers go through **Firebase Auth**. Without this setup, the email/password flow still works fine — only the "Continue with Google" / "Continue with Apple" buttons are disabled.

1. Go to https://console.firebase.google.com/ and create (or pick) a project.
2. **Authentication → Sign-in method →** enable **Google**. (Apple requires a paid Apple Developer account; skip for now.)
3. **Project settings → Your apps →** add a **Web** app. Copy the SDK config values into `.env`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
4. **Project settings → Service accounts → Generate new private key.** Open the downloaded JSON and copy these three fields into `.env`:
   ```
   FIREBASE_PROJECT_ID=...
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   Keep the `\n` characters as literal `\n` — don't replace them with real newlines.
5. **Authentication → Settings → Authorized domains** — make sure `localhost` is listed (it is by default).
6. Restart `npm run dev`. The Google button now works end-to-end.

---

## 9 · Access from your phone

Three options, ordered easiest → most permanent.

### Option A — Same WiFi (instant, free)

Use this to test the app on your phone while your laptop is running `npm run dev` and both are on the same WiFi.

1. Find your laptop's local IP:
   - **Windows:** `ipconfig` → look for "IPv4 Address" (e.g. `192.168.1.42`)
   - **macOS / Linux:** `ifconfig | grep "inet "` or `ip addr`
2. Start the dev server bound to all interfaces:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```
3. On your phone, open `http://192.168.1.42:3000`

**Limits:** only works when phone + laptop are on the same WiFi. URL changes when your laptop's IP changes. Nobody outside your house can use it.

---

### Option B — Public URL via Cloudflare Tunnel (~10 min, free)

Gives you a real `https://<random-name>.trycloudflare.com` URL that maps to your localhost. Works from any phone on any network — yours or your friends'. As long as your laptop is on and `npm run dev` is running.

1. Install **cloudflared** once:
   - **Windows:** `winget install Cloudflare.cloudflared`
   - **macOS:** `brew install cloudflared`
   - **Linux:** see https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Each time you want a public URL:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
3. The terminal prints a URL like `https://something-something.trycloudflare.com`. Open it on your phone.

**Tradeoffs:** URL changes every time you restart the tunnel (unless you pay for a named tunnel — free with a custom domain). Closes when you close your laptop. Good for showing the app to friends right now.

---

### Option C — Real deployment to Vercel (½ day setup, free tier)

A permanent `https://gymmate.vercel.app` URL that works whether your laptop is on or not. This is how a real app ships.

**What needs to change first** (none of it is hard, but it's not zero):

1. **Database:** SQLite doesn't work on Vercel's serverless. Switch to **Neon Postgres** (free tier, 1-click via Vercel marketplace).
   - Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`.
   - Change `fitnessGoals String?` (comma-separated) to `fitnessGoals String[]` since Postgres supports real arrays. Update `src/lib/profile.ts` `parseGoals`/`joinGoals` accordingly.
   - Re-create migrations: `npx prisma migrate dev --name init_postgres`.
   - Paste Neon's connection string into Vercel's `DATABASE_URL` env var.
2. **Photo uploads:** `/public/uploads/` doesn't persist between deploys on Vercel. Swap to **Cloudflare R2** (free tier) or **AWS S3**.
   - Update `src/app/api/profile/photos/route.ts` to use the S3 SDK instead of `fs.writeFile`.
   - Update `prisma/schema.prisma` if you want to store a key separate from the URL.
3. **Redis:** for refresh-token storage. Use **Upstash Redis** (free tier, 1-click via Vercel marketplace).
   - Paste Upstash's `REDIS_URL` into Vercel's env vars. The existing code already uses Redis when `REDIS_URL` is set.
4. **Firebase env vars:** paste your Google sign-in creds into Vercel's env settings (both `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_*`).
5. **Connect GitHub:** in Vercel → New Project → import the GymMate repo. Set the **Root Directory** to `gymmate/`. Every push to `main` auto-deploys in ~2 minutes.
6. **Authorized domains in Firebase:** after Vercel gives you a URL, add it to Firebase Console → Authentication → Settings → Authorized domains.

Once deployed, you can push from any laptop / Codespace / GitHub web UI and Vercel rebuilds automatically.

---

## 10 · (Optional) Control via Claude Code from your phone

If you want to keep developing GymMate from your phone using Claude's mobile app:

1. Make sure you're logged into the **same Claude account** on both your laptop and your phone.
2. Open the Claude mobile app → **Code** tab.
3. If you don't see any sessions:
   - On the **laptop side**, you need to be running Claude Code in a mode that syncs to the cloud (the desktop Claude app, not just `claude` CLI in a plain terminal).
   - Tap **New session** in the mobile app to spin up a fresh cloud Claude Code environment. Inside it, you can `git clone` GymMate and pick up.
4. **Important:** even with remote Claude Code working, the dev server has to be **reachable from the cloud session** for it to actually run the app. That means either:
   - Deploy via Option C above (then the cloud Claude session just uses the Vercel URL), or
   - Use Cloudflare Tunnel (Option B) on your laptop and give that public URL to the cloud Claude session.

---

## 11 · Project structure quick reference

```
GymMate/
├── SETUP.md                       ← this file
├── HANDOVER.md                    ← high-level project overview
└── gymmate/                       ← the Next.js app
    ├── prisma/
    │   ├── schema.prisma          ← all database models
    │   ├── migrations/            ← migration history
    │   └── dev.db                 ← local SQLite db (gitignored)
    ├── public/uploads/            ← user photo uploads (gitignored)
    ├── scripts/                   ← 4 test suites (auth, match, profile, messages)
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/            ← login + register pages
    │   │   ├── api/
    │   │   │   ├── auth/          ← register, login, refresh, logout, firebase, me
    │   │   │   ├── profile/       ← own profile + public profile + photos
    │   │   │   ├── discover/      ← /api/discover (paginated swipe deck)
    │   │   │   ├── swipe/         ← /api/swipe (like/pass + match detection)
    │   │   │   ├── matches/       ← /api/matches (list with unread count)
    │   │   │   └── messages/      ← chat history, send, SSE stream, mark-read, unread total
    │   │   ├── messages/          ← /messages list + /messages/[matchId] chat
    │   │   ├── profile/           ← profile view + edit
    │   │   ├── page.tsx           ← Match page (root)
    │   │   └── layout.tsx         ← root layout, AuthProvider, BottomNav
    │   ├── components/
    │   │   ├── bottom-nav.tsx
    │   │   ├── social-login-buttons.tsx
    │   │   ├── profile-completion-banner.tsx
    │   │   └── ui/                ← shadcn primitives
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   ├── lib/
    │   │   ├── db.ts, redis.ts, jwt.ts, auth.ts, cookies.ts
    │   │   ├── validation.ts, profile.ts
    │   │   ├── firebase-admin.ts, firebase-client.ts
    │   │   ├── match-access.ts    ← chat ACL helper
    │   │   └── message-bus.ts     ← in-process SSE pub/sub
    │   └── middleware.ts          ← edge auth redirects
    ├── .env.example               ← env var template (every var documented)
    └── package.json
```

---

## 12 · Git workflow

The repo follows a simple rule: **build on `Milap`, ship to `main` via PR**.

```bash
git checkout Milap
# ... make changes, test ...
git add <files>
git commit -m "Your message"
git push origin Milap

# Then open a PR:
gh pr create --base main --head Milap --title "..." --body "..."
gh pr merge <number> --merge
```

All commits must be authored as **MilapSuthar** — never include `Co-Authored-By: Claude` lines.

---

## 13 · What's already done vs. what's next

### ✅ Built and tested
- Auth: register, login, refresh, logout, Google sign-in scaffold, route middleware (9/9 tests)
- Profile: edit, photo upload (max 6), public profile, completion banner (7/7 tests)
- Match: discover deck, swipe, mutual-like detection, match modal, empty state (8/8 tests)
- Chat: list with unread badges, chat detail with SSE real-time, pagination, mark-as-read, 403 for outsiders (8/8 tests)
- UI shell: 7-tab bottom nav, logout in profile page

### 🔲 Roadmap (none of this is started)
- Apple sign-in (waiting on Apple Developer account)
- Help Board CRUD
- Trainer search + Stripe booking
- Nutrition: daily macro logging + meal plan purchase
- Exercise library + workout logging
- S3 / R2 photo uploads
- Geolocation-based discover filter
- Email verification + password reset
- Production deploy (see Option C above)

---

## 14 · Troubleshooting

| Symptom | Fix |
|---|---|
| `prisma generate` fails with EPERM on Windows | The dev server is holding the engine file. Stop `npm run dev` first, run `npx prisma generate`, restart. |
| Login works, but reloading the page logs you out | Refresh-token store was wiped. In dev with no Redis, this happens every server restart — the cookie auto-clears and you're sent to `/login`. Just log in again. |
| Stuck on a loading skeleton with a stale cookie | The fix in commit `6595678` handles this — make sure you're on the latest `Milap`. |
| SSE chat messages don't appear in real time | Check that `runtime = "nodejs"` is still set on the `/stream` route — the edge runtime can't keep streams open. |
| Schema change isn't reflected | After editing `prisma/schema.prisma`, you must run a migration: `npx prisma migrate dev --name your_change_name` (or write the SQL by hand and use `prisma migrate deploy`). |

---

*If you're an AI assistant continuing this project: read `HANDOVER.md` next for the architectural rules, then look at the relevant test script under `gymmate/scripts/` for the contract any new feature should match.*
