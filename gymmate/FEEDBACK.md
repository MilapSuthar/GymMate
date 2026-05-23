# GymMate — Honest User Feedback & Launch Roadmap

*Written from the perspective of a fitness-app user evaluating GymMate for daily use.*

---

## TL;DR

GymMate is ambitious in a way most fitness apps aren't — you've packed five legit verticals (partner matching, Q&A, trainers, nutrition, exercise library) into one product. That's a strong moat *if* you can pull it off. Right now the bones are good (Next.js 16, Prisma, Firebase auth, Stripe), but each vertical is at "MVP minus one critical feature." None of the five is yet good enough that I'd uninstall MyFitnessPal/Strong/Hinge to use GymMate instead.

To launch as a business, you need to do three things before anything else:

1. **Pick a wedge.** Don't launch all 5 verticals at once. Launch *Match* (gym partners) first — it's the only one without a dominant competitor. Trainers/Nutrition/Exercise can come later as upsells.
2. **Fix safety and trust.** A swipe-to-match app with no gender filter, no photo verification, no report/block, and no age-appropriate gating will get one bad press cycle and die.
3. **Replace SQLite with Postgres and add real photo/video storage.** You cannot ship `prisma/dev.db` to production. You cannot store profile photos as raw URL strings users paste in.

The rest of this doc is what I felt as a user, vertical by vertical.

---

## First impression (the part that decides if I stay)

I open the app and land on `/` which is the Match tab. Cool — but I have *no idea what GymMate is* unless I already signed up. There's no landing page, no "what is this," no value prop. If a friend sends me a link, I see a login wall. That's a 60-70% drop-off rate on cold traffic.

**Fix:** Build a marketing landing page at `/` for logged-out users. Three sections: hero ("Find your gym partner"), how-it-works, app screenshots. Move Match to `/discover` or `/match`. Use Next.js' middleware to redirect logged-in users to `/discover`.

The "ProfileCompletionBanner" tells me my profile is incomplete — but only after I'm already swiping. That's backwards. **Onboarding should be a mandatory funnel** after signup: name → photos → goals → experience level → gym → preferences (who you want to match with). Don't let me swipe until I've done this; the match quality is worse for *everyone* if half your users are blank profiles.

---

## The Match tab (your wedge — make this great)

I want to like this. The card is clean, the gradients-as-fallback trick is smart, the optimistic swipe is snappy. But:

**The dealbreakers:**

- **No gender preference filter.** This is the #1 reason women won't use the app. Hinge/Bumble/Tinder all let you say who you want to see. Add: "Show me [men / women / non-binary / everyone]" and "Show me to [...]" Without this, you have a safety problem and a UX problem.
- **No age range filter.** I'm 35 — I don't want to swipe past 19-year-olds. Standard slider, 18-65.
- **No report or block button.** The moment a user gets a creepy message, the only option is uninstall. I need to be able to report a profile from the card AND from the chat. Reports need to land somewhere — build a basic admin moderation queue.
- **Photo verification is missing.** Every modern dating-style app has "verified profile" with a selfie-pose check. Without it, the app is full of scrapers, bots, and catfish within weeks of launch.
- **Bio is in the API response but not shown on the card.** I'm swiping based on a photo, a name, a gym, and 3 hashtag-style goals. That's not enough signal. Add the bio, add experience level prominently, add "looking for: spotter / training partner / class buddy."
- **It's not actually a swipe.** It's two buttons. Native Tinder-style left/right gesture is table stakes — users muscle-memory it. Even on the web, a draggable card with rotation feedback is doable (Framer Motion handles this in ~40 lines).
- **Only one photo per card.** Real users want to see 3-6 photos. The schema supports `UserPhoto[]` — surface them. Add tap-to-cycle or a small photo dots indicator.
- **No undo.** Bumble's "rewind" is premium for a reason — it's the #1 paid feature. Free apps offer one per day; paid offer unlimited.
- **Distance filter doesn't say what happens when I have no coords.** If location permission was denied, the filter chips are useless. The empty state should explain "Enable location to filter by distance" with a button to re-prompt.

**The "It's a Match" modal is good** — punchy, has a clear next action. Keep that.

---

## Help Board

It's basically Stack Overflow / Reddit for fitness Q&A. Fine concept. But:

- **No accepted-answer flow.** The asker should be able to mark one answer as the answer. Sorts that to the top, gives the answerer reputation. This is the entire engine of Stack Overflow.
- **No reputation / expert badges.** If a certified PT or RD answers, I should see a verified badge. Otherwise I'm taking medical/fitness advice from "GymBro_2009."
- **No moderation.** Anyone can post anything. The first time someone asks about steroid cycles or eating-disorder behaviors, you need a flagging path and a moderation queue. Build this *before* you have 1,000 users, not after.
- **No tag search/browse.** Tags are stored as comma-separated strings — fine for storage, but I should be able to tap a tag and filter the board. Right now they're decorative.
- **No notification when my question is answered.** You have FCM tokens already. Wire `new_answer` notifications all the way through. *(Note: I see the notification type exists in the schema — make sure the trigger is implemented.)*

---

## Trainers (this is where the marketplace risk lives)

I'd be most nervous shipping this. It's a two-sided marketplace with real money, real bodies, and real legal exposure. Specifics from what I saw:

- **`verified: false` by default with no clear path to `true`.** Trainers should not be bookable until verified. Verification needs: government ID, certification upload (NASM/ACE/REPS/CIMSPA), insurance proof, optional background check (Checkr/Onfido).
- **No availability calendar.** A client picks any date/time — the trainer can't say "I'm booked Tuesday 6pm." This means double-bookings and chargebacks from day one. Add: trainer sets weekly recurring availability + one-off blocks; client only sees open slots.
- **Reviews don't exist as a feature.** `rating` and `reviewCount` are fields in the schema but I see no submission flow. After a completed booking, trigger a review prompt. Without reviews, your trust signal is `verified: bool` and nothing else.
- **Stripe is going to one account, not the trainer.** I see `stripe.checkout.sessions.create` patterns but no Stripe Connect. For a marketplace you legally need Connect (Express or Custom) so each trainer is a connected account, you take an application fee, and payouts go to them. Without this, you're holding money for other people, which is regulated.
- **No cancellation/refund policy.** What happens if the client cancels 2 hours before? If the trainer no-shows? Build a policy, surface it at booking, codify it in the booking state machine: `pending → confirmed → completed | cancelled_by_client | cancelled_by_trainer | no_show`.
- **No chat between client and trainer before booking.** I'd never pay £40 without asking "Have you trained someone with my injury history?" first. A pre-booking inquiry chat is essential.
- **No trial / discovery session pricing.** First session at 50% off converts dramatically better than full price. Make this a trainer-side toggle.
- **Trainer dashboard is missing core stuff.** I'd want: today's sessions, this week's earnings, pending requests to approve, profile views, a clear "how to get more bookings" coaching panel.

---

## Nutrition

Honestly the weakest tab as a user. To beat MyFitnessPal/Cronometer, you can't ship "type your calories manually."

- **No food database.** Users want to type "chicken breast 200g" and have it auto-fill macros. License USDA FoodData Central (free), Open Food Facts (free, has barcodes), or pay for Nutritionix (~$0.005/req).
- **No barcode scanner.** PWA's `BarcodeDetector` API gets you 80% of the way for free.
- **AI photo logging.** This is the new bar — point camera at plate → macros. Anthropic's Claude or OpenAI's vision API both do this competently. It's a strong differentiator.
- **Targets are hardcoded.** `CALORIE_TARGET = 2000` is in the source — every user sees the same goals. Calculate Mifflin-St Jeor TDEE from age/weight/height/activity (your profile already has age) and let users override.
- **No water tracking, no recipe builder, no meal copy/paste from yesterday.** All bread-and-butter features.
- **Meal plans are interesting** but the dietitian onboarding (DietitianProfile) has just `registrationId` and `verified: bool` with no visible verification flow. Same concerns as the trainer side — you're putting medical-adjacent advice behind a paywall; that has liability.

---

## Exercise

Best of the five technically — clean library, PR tracking, the muscle-group color tags are nice. But this is the *most* commoditized category (Strong, Hevy, FitNotes own it), so to win here:

- **No workout templates.** Pre-built routines (PPL, 5/3/1, StrongLifts 5x5, Stronger by the Day, etc.) are how users start. Right now I have to build every workout from scratch.
- **No rest timer.** Every lifter wants this between sets.
- **No progress charts.** You're storing every set with reps/weight/setNumber — the data is there. Show me a weight-over-time line chart for each exercise. PRs are just one number; trends are the story.
- **`videoUrl` exists on Exercise but who's hosting the videos?** YouTube embeds? Self-hosted? This is a content production problem, not a code problem — but you need a plan. Without demo videos, beginners bounce.
- **No 1RM calculator** (Epley/Brzycki formula — 10 lines of code).
- **No supersets / circuits / drop sets** in the workout log structure.
- **No social — share a workout with my match.** This is the integration nobody else has: "Hey, here's the leg day I'm doing tomorrow at 6pm at our gym."

---

## Cross-cutting issues (the boring stuff that kills launches)

**Infrastructure:**
- **SQLite (`provider = "sqlite"`)** — fine for dev, *catastrophic for production*. Switch to Postgres now, not at scale. Run `prisma migrate reset` against a fresh Postgres locally and update connection strings. Hosting: Neon, Supabase, or Railway, all have free tiers.
- **Photo storage is undefined.** `User.photoUrl` is just a string. Where do uploaded photos go? You need S3 / Cloudflare R2 / Firebase Storage with signed upload URLs, image resizing (Sharp or Cloudflare Images), and a CDN.
- **No image moderation.** AWS Rekognition or Cloudflare's CSAM/NSFW APIs need to be in the photo upload path before launch. This is non-negotiable for any app with user-uploaded photos.
- **Redis is imported (`ioredis`) but I didn't see what it's used for.** If it's rate limiting / sessions, document that. If it's not used, drop the dependency.

**Compliance & business:**
- **No Privacy Policy / Terms of Service / Cookie consent.** You collect location, photos, email, payment info — you need these before launch. GDPR/CCPA both require account deletion ("Delete my data") and data export endpoints. Neither exists yet.
- **No age gate.** A swipe-to-match app needs 18+ confirmation, and serious enforcement (date-of-birth at signup, not just "I confirm I'm 18"). You currently store `age` as optional.
- **No analytics.** You can't run a business without funnel data. Wire PostHog or Mixpanel: signup → onboard → first swipe → first match → first message → D1/D7/D30 retention. Without this, every product decision is a guess.

**Monetization (you need this to be a business):**
- Right now revenue = trainer-booking cut + meal-plan sales. That's transactional and slow.
- Add **GymMate Plus** subscription: unlimited rewinds, see who liked you, advanced filters (gender, experience, schedule overlap), unlimited messages to non-matches. £7.99/mo benchmark.
- Add **boost** ($1.99 single-use, top of the stack for 30 min) — Tinder makes ~$500M/yr on these.
- Trainer marketplace: 15-20% take rate is standard.
- Meal plans: same.
- **Referrals**: "Invite a friend, both get 1 week of Plus." Cheapest CAC you'll ever have.

**Mobile distribution:**
- Right now this is a Next.js web app. To compete with native fitness apps, you need either (a) a PWA you market hard, or (b) Capacitor/React Native wrappers in the App Store and Play Store. Apple takes 30% (15% for subs after year 1) which you need to model into your unit economics.

---

## Suggested 12-week roadmap to launch

### Weeks 1–2: Foundations
- Migrate SQLite → Postgres
- Set up object storage + image resizing pipeline for user photos
- Add image moderation (Rekognition or equivalent) to photo upload
- Write Privacy Policy, Terms of Service, age gate at signup
- Build account deletion + data export endpoints
- Add PostHog / Mixpanel analytics, instrument the signup → first-match funnel

### Weeks 3–4: Match tab to A-grade
- Gender preference + age range filters (both directions)
- Report + block flows, basic moderation admin page
- Photo verification (selfie-match)
- Drag-to-swipe gesture, multi-photo carousel, show bio on card
- Onboarding funnel as a hard gate before discover

### Weeks 5–6: Messaging + safety
- Read receipts, typing indicators
- Image sharing (with moderation)
- Report/block from chat
- Push notifications fully wired (matches, messages, answers, bookings)

### Weeks 7–8: Trainer marketplace, properly
- Stripe Connect (Express) for trainer payouts
- Trainer availability calendar
- Reviews after completed bookings
- Cancellation policy + state machine
- Pre-booking chat
- Verification flow (ID + cert upload, manual review queue)

### Weeks 9–10: One killer differentiator
- Pick ONE: AI photo-to-macros logging, or workout-share-to-match, or video form-check upload. Don't do all three. Ship one with polish.

### Week 11: Monetization
- GymMate Plus subscription (Stripe Billing)
- Referral program
- App Store / Play Store wrappers via Capacitor

### Week 12: Beta launch
- 100-user closed beta in one city (your gym, your friends, expand from there)
- Heavy instrumentation, daily retention review
- Iterate before opening signup

---

## What I'd cut or defer

- **The Help Board.** It's a content-network feature that only works with scale. Keep the schema, hide the tab until you have 5,000+ active users. Pre-launch, the board will look empty and dead.
- **Nutrition's meal-plan marketplace.** Same — defer until you have users. Replace with a strong manual logging + barcode + AI photo MVP first; sell meal plans when you have an audience.
- **The "Become a Trainer" flow.** Don't open trainer signup to the public; recruit your first 20 trainers manually, vet them yourself, then build the self-serve flow once you understand the supply side.

---

## What you're doing right (keep it)

- The tech stack choice is genuinely strong. Next.js 16 + Prisma + Firebase + Stripe is what a modern startup should use.
- The visual design system is clean and consistent — bottom nav, card-based layouts, skeleton/empty/error states all handled.
- The optimistic swipe with rollback-on-failure is the kind of detail that signals product care.
- Distance-based discovery is the right primary axis for a gym-partner app (versus pure interest matching).
- Firebase + JWT dual auth is a smart pragmatic choice for fast social login + your own session control.

You've built more in v0.1 than most teams ship in v1.0. The path from here to a real business is mostly about **focus, trust, and infrastructure** — not adding more features.

Good luck. Hit me up when you're ready to do the Stripe Connect migration; it's where most marketplace startups stumble.
