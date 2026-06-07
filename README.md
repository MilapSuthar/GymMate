# GymMate

Find a gym partner near you. Match by gym, schedule overlap, and training
goals — then meet up and stay accountable.

GymMate's V1 is built around one job: helping lifters find someone reliable
to train with at their gym, at the time they actually train. It is not a
generic fitness app and it is not trying to be MyFitnessPal, a trainer
marketplace, or a Reddit clone. It is a focused buddy-finder + community
+ chat app.

## What's here

- A swipe-style discovery deck ranked by schedule overlap and distance
- A "Likes You" inbox so you can see who liked you back
- Match-based chat
- A community / meetups board (coming next)
- Daily streak + accountability primitives
- Safety: report, block, and rate-limiting on every write endpoint

## Tech

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Prisma + SQLite
in dev / Postgres in prod · Firebase Auth + JWT · Stripe (deferred for V1)
· Tailwind 4 · shadcn/ui.

## Repo layout

```
GymMate/
├── gymmate/        the Next.js application
├── HANDOVER.md     project status + decisions log
├── Plan.txt        product / launch plan
├── SETUP.md        environment + secrets setup
└── VISION.md       product vision (multi-year)
```

Application setup and dev instructions live in [`gymmate/README.md`](./gymmate/README.md).

## V1 status

| Feature                    | State                |
| -------------------------- | -------------------- |
| Auth (credentials + OAuth) | shipped              |
| Match deck + overlap       | shipped              |
| Likes You inbox            | shipped              |
| Rewind                     | shipped              |
| Daily streak               | shipped              |
| Block + report             | shipped              |
| Rate limiting              | shipped              |
| Chat (poll-based)          | shipped              |
| Community / Meetups        | building             |
| Post-meetup check-in       | next                 |
| Trainer marketplace        | deferred to V2       |
| Nutrition tracking         | deferred to V2       |
| Exercise library           | deferred to V2       |
