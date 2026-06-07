# GymMate — Next.js app

The application source for GymMate. See [the top-level README](../README.md)
for the product overview.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**, **TypeScript**
- **Prisma 6** + **SQLite** in dev (`prisma/dev.db`)
- **Firebase** for OAuth (Google, Apple) + **JWT** for our own sessions
- **Tailwind 4** + **shadcn/ui** + **lucide-react**
- **ioredis** for rate-limit + refresh-token storage (memory fallback in dev)

## Local setup

```bash
# Install dependencies
npm install

# Set up environment (copy and fill in)
cp .env.example .env

# Apply migrations + regenerate the Prisma client
npx prisma migrate dev
npx prisma generate

# Start the dev server
npm run dev
```

The app boots at [http://localhost:3000](http://localhost:3000).

> **Important:** if you change the Prisma schema or pull a branch that did,
> always re-run `npx prisma generate` before `npm run dev`, or you will see
> "unknown field" errors at runtime. If a route 500s with a query error,
> regenerating the client is almost always the fix.

## Scripts

| Command                  | What it does                          |
| ------------------------ | ------------------------------------- |
| `npm run dev`            | Turbopack dev server with HMR         |
| `npm run build`          | Production build                      |
| `npm run start`          | Run a built app                       |
| `npm run lint`           | ESLint                                |
| `npx prisma studio`      | Visual DB browser                     |
| `npx prisma migrate dev` | Apply pending migrations + generate   |

## Folder layout

```
src/
├── app/                 routes (App Router)
│   ├── (auth)/          login + register
│   ├── api/             route handlers
│   ├── matches/         match list + chat
│   ├── likes/           "Likes You" inbox
│   └── onboarding/      mandatory onboarding funnel
├── components/          shared components (top-bar, bottom-nav, ui)
├── context/             AuthContext provider
├── lib/                 db, auth, rate-limit, profile helpers, etc.
└── middleware.ts        route protection (cookie-presence gate)
prisma/
├── schema.prisma        canonical schema
└── migrations/          versioned migration history
```
