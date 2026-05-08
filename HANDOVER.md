# GymMate — Project Handover

> A shareable document explaining what GymMate is, what's been built, how to run it, and what to build next. Hand this to a developer (or their AI assistant) and they should be able to pick up the work cold.

---

## 1. What Is GymMate?

GymMate is a **fitness social network web app** — Tinder meets LinkedIn for gym-goers. It helps people:

- Find workout partners at their local gym (swipe-style matching)
- Ask and answer fitness questions (Help Board)
- Connect with personal trainers (search + Stripe booking)
- Get nutrition guidance from dietitians
- Track their own workouts and macros

**Founder:** Milap (does not write code — directs AI to build the app)
**Repo:** https://github.com/MilapSuthar/GymMate
**Active branch:** `Milap` (PR → `main`)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Prisma 6 + SQLite (dev) → PostgreSQL (prod) |
| Auth | JWT access tokens + opaque refresh tokens (Redis with in-memory fallback) |
| Passwords | bcryptjs (cost 12) |
| Google OAuth | firebase-admin |
| Forms | react-hook-form + zod |
| Package manager | npm |

> ⚠️ **Stay on Prisma v6.** v7 breaks schema-based config.

---

## 3. Project Structure

```
GymMate/
└── gymmate/                          ← the actual Next.js app
    ├── prisma/
    │   ├── schema.prisma             ← all database models
    │   └── dev.db                    ← SQLite dev DB (gitignored)
    ├── public/uploads/               ← user photo uploads (gitignored)
    ├── scripts/
    │   ├── test-auth.mjs             ← 9 backend auth checks
    │   ├── test-frontend-auth.mjs    ← 8 frontend auth checks
    │   └── test-profile.mjs          ← 7 profile feature checks
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/               ← route group: login/register, no bottom nav
    │   │   ├── api/auth/             ← register, login, google, refresh, logout, me
    │   │   ├── api/profile/          ← GET/PUT own, GET public, photo upload/delete
    │   │   ├── help-board/, trainers/, nutrition/, exercise/, profile/  ← stubs
    │   │   ├── page.tsx              ← Match page (hardcoded demo card)
    │   │   └── layout.tsx            ← AuthProvider + BottomNav
    │   ├── components/
    │   │   ├── bottom-nav.tsx
    │   │   ├── profile-completion-banner.tsx
    │   │   └── ui/                   ← shadcn components
    │   ├── context/AuthContext.tsx   ← global auth state + authFetch
    │   ├── lib/
    │   │   ├── prisma.ts, redis.ts, jwt.ts
    │   │   ├── auth.ts               ← withAuth() HOF
    │   │   ├── cookies.ts            ← refresh cookie helpers
    │   │   └── profile.ts            ← shared constants/helpers
    │   └── middleware.ts             ← edge auth redirects
    ├── .env.example
    └── package.json
```

---

## 4. What's Already Built ✅

### Authentication (Backend)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/register` | POST | Create user, return access token + set refresh cookie |
| `/api/auth/login` | POST | Validate password, issue tokens |
| `/api/auth/google` | POST | Verify Firebase ID token, upsert user |
| `/api/auth/refresh` | POST | Read httpOnly cookie, rotate token pair |
| `/api/auth/logout` | POST | Revoke refresh token, clear cookie |
| `/api/auth/me` | GET | Return current user (bearer required) |

**Security model:**
- Access tokens: 15-min JWTs, in-memory only (XSS-resistant)
- Refresh tokens: 48-byte random hex, Redis-stored, 7-day TTL, **rotated on every refresh**
- Refresh cookie: httpOnly, sameSite: lax, secure in prod
- Passwords: bcrypt cost 12

### Authentication (Frontend)
- `/login` and `/register` pages with RHF + zod validation
- `AuthContext` with `user`, `login()`, `logout()`, `register()`, `authFetch()`
- Silent refresh on page load (cookie → new access token)
- Edge middleware redirects unauthenticated users to `/login?next=<path>`

### User Profile
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/profile` | GET | Own profile + photos |
| `/api/profile` | PUT | Update bio, gym, goals, experience, displayName |
| `/api/profile/[userId]` | GET | Public profile (sensitive fields stripped) |
| `/api/profile/photos` | POST | Upload (multipart, max 6, max 5MB, JPEG/PNG/WebP/GIF) |
| `/api/profile/photos/[photoId]` | DELETE | Owner-only delete |

### UI Shell
- Bottom nav (Match, Help, Trainers, Nutrition, Exercise, Profile) + Logout
- Match page with demo card (not yet wired to real data)
- Profile completion banner (shows when bio or photo missing)
- 5 placeholder pages

---

## 5. Database Models (Prisma)

```
User             id, email, name, displayName, passwordHash?, googleId?, provider,
                 bio, gymName, fitnessGoals (CSV string), experienceLevel
                 → photos: UserPhoto[]

UserPhoto        id, userId, url, createdAt

Swipe            id, swiperId, targetId, liked, createdAt
Match            id, user1Id, user2Id, createdAt → messages: Message[]
Message          id, matchId, senderId, content, createdAt

Question         id, authorId, title, body, tags → answers: Answer[]
Answer           id, questionId, authorId, body, createdAt

TrainerProfile   id, userId, bio, specialties, hourlyRate, available
Booking          id, trainerId, clientId, scheduledAt, status, stripePaymentId

DietitianProfile id, userId, bio, specialties, hourlyRate, available
MealPlan         id, dietitianId, userId, title, content, createdAt
NutritionLog     id, userId, date, calories, protein, carbs, fat, notes

Exercise         id, name, category, muscleGroups, description, videoUrl
WorkoutLog       id, userId, date, notes → sets: WorkoutSet[]
WorkoutSet       id, logId, exerciseId, sets, reps, weight, duration
```

> Note: `fitnessGoals` is stored as a CSV string in SQLite. Convert to array in the API layer. When migrating to PostgreSQL, change to a real `String[]` column.

---

## 6. Environment Variables

Create `gymmate/.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="long-random-string-min-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional — uses in-memory fallback if missing
REDIS_URL="redis://localhost:6379"

# Optional — Google OAuth disabled without these
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 7. Run Locally

```bash
git clone https://github.com/MilapSuthar/GymMate.git
cd GymMate/gymmate
npm install
cp .env.example .env       # then edit values
npx prisma migrate dev
npm run dev                # → http://localhost:3000
```

## 8. Run Tests

```bash
# With dev server running:
node scripts/test-auth.mjs           # 9 backend checks
node scripts/test-frontend-auth.mjs  # 8 frontend checks
node scripts/test-profile.mjs        # 7 profile checks
```

---

## 9. What's Next (Roadmap)

### High priority
- **Match swipe API** — `POST /api/swipes`, mutual-like detection, real profiles, geolocation filtering, swipe animation (Framer Motion)
- **Help Board** — `GET/POST /api/questions`, answers, tag filtering, feed + detail pages
- **Profile UI** — `/profile` view page, `/profile/edit` form, photo upload + delete UI

### Medium priority
- **Trainers** — search, profile creation, Stripe booking flow
- **Nutrition** — daily macro logging, meal plan purchase, weekly charts
- **Exercise** — seed library, search by muscle group, workout logging + history
- **Messaging** — real-time chat between matched users (WS or polling)

### Infrastructure
- Migrate SQLite → PostgreSQL
- Move uploads from `/public/uploads/` → S3 / Cloudflare R2
- Wire real Redis (drop in-memory fallback for prod)
- Email verification + password reset
- Deploy to Vercel

---

## 10. Architectural Rules (For AI Continuity)

1. **Stay on `prisma@^6`** — v7 breaks the schema config.
2. **All commits go under Milap's name only** — never add `Co-Authored-By` lines.
3. **Branch flow:** build on `Milap` → push → PR → merge to `main`.
4. **All protected API routes use `withAuth()`** from `src/lib/auth.ts`.
5. **Frontend authenticated requests use `authFetch`** from `AuthContext` — handles token injection + silent refresh.
6. **Photo limit (6) is enforced via Prisma transaction** — count check + create in one atomic step.
7. **The `(auth)` route group** intentionally has no bottom nav.
8. **Refresh tokens are opaque random strings, not JWTs** — so they can be revoked in Redis on logout.
9. **Edge middleware can't access Redis/Prisma** — it only checks cookie presence; AuthContext validates on the client.

---

## 11. Branch State

| Branch | State |
|---|---|
| `main` | Clean — `gymmate/` app + `Plan.txt`. Phase-1 monorepo revert applied. |
| `Milap` | Active feature branch |

---

*Last updated: 2026-05-08*
