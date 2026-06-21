#!/usr/bin/env node
/**
 * Demo seed — wipes the dev user-content tables (swipes, matches, messages,
 * meetups, RSVPs, demo users) and reseeds the database with 8 realistic-
 * feeling lifters, 3 upcoming meetups, and a clean short chat in one match.
 *
 * Run with:
 *   npm run seed:demo -- --yes
 *
 * The `--yes` flag is required to confirm the wipe; without it the script
 * prints what it would do and exits. Existing non-demo (human) accounts are
 * preserved; only their *content* (matches/messages/meetups) is reset.
 *
 * If the dev DB already has at least one human user, the script pairs the
 * first three demo lifters as mutual matches with the oldest human account
 * so the /matches list is populated in the demo. The remaining demo lifters
 * stay un-swiped so they appear in the /discover deck.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demopassword";
const DEMO_EMAIL_DOMAIN = "@gymmate.demo";
const OTTAWA_LAT = 45.4215;
const OTTAWA_LNG = -75.6972;

function nearby() {
  // Spread points within roughly 5 km of downtown Ottawa.
  return {
    latitude: OTTAWA_LAT + (Math.random() - 0.5) * 0.05,
    longitude: OTTAWA_LNG + (Math.random() - 0.5) * 0.05,
  };
}

function yearsAgo(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

const DEMO_USERS = [
  {
    email: "alex.chen" + DEMO_EMAIL_DOMAIN,
    name: "Alex Chen",
    displayName: "Alex",
    gender: "male",
    showMeGenders: "female,non_binary,male",
    age: 28,
    dateOfBirth: yearsAgo(28),
    bio: "Powerlifter chasing a 3-plate squat. Looking for morning training partners who actually show up.",
    gymName: "Goodlife Fitness Kanata",
    fitnessGoals: "strength,muscle-gain",
    experienceLevel: "intermediate",
    gymSchedule: "mon_morning,wed_morning,fri_morning,sat_morning",
    lookingFor: "spotter,partner",
  },
  {
    email: "priya.sharma" + DEMO_EMAIL_DOMAIN,
    name: "Priya Sharma",
    displayName: "Priya",
    gender: "female",
    showMeGenders: "female,male,non_binary",
    age: 31,
    dateOfBirth: yearsAgo(31),
    bio: "Marathon runner, recovering perfectionist. Long runs on weekends, easy runs after work.",
    gymName: "Movati Athletic Orleans",
    fitnessGoals: "cardio,flexibility",
    experienceLevel: "advanced",
    gymSchedule: "tue_evening,thu_evening,sat_morning,sun_morning",
    lookingFor: "accountability,partner",
  },
  {
    email: "jordan.b" + DEMO_EMAIL_DOMAIN,
    name: "Jordan Baxter",
    displayName: "Jordan",
    gender: "non_binary",
    showMeGenders: "female,non_binary,male",
    age: 25,
    dateOfBirth: yearsAgo(25),
    bio: "New to lifting and want to learn the right way. Patient partners welcome.",
    gymName: "Anytime Fitness Centretown",
    fitnessGoals: "strength,muscle-gain",
    experienceLevel: "beginner",
    gymSchedule: "mon_evening,wed_evening,fri_evening",
    lookingFor: "accountability,class-buddy",
  },
  {
    email: "sam.iyer" + DEMO_EMAIL_DOMAIN,
    name: "Sam Iyer",
    displayName: "Sam",
    gender: "male",
    showMeGenders: "female,non_binary,male",
    age: 34,
    dateOfBirth: yearsAgo(34),
    bio: "Powerbuilding split, 5-day. Bring good coffee and we'll get along.",
    gymName: "Goodlife Fitness Kanata",
    fitnessGoals: "muscle-gain,strength",
    experienceLevel: "advanced",
    gymSchedule: "mon_morning,tue_morning,thu_morning,fri_morning,sat_morning",
    lookingFor: "spotter,partner",
  },
  {
    email: "maria.l" + DEMO_EMAIL_DOMAIN,
    name: "Maria Lopez",
    displayName: "Maria",
    gender: "female",
    showMeGenders: "female",
    age: 29,
    dateOfBirth: yearsAgo(29),
    bio: "Crossfit-adjacent, mostly barbell + conditioning. Looking for a steady group I can show up with.",
    gymName: "F45 Westboro",
    fitnessGoals: "strength,cardio",
    experienceLevel: "intermediate",
    gymSchedule: "mon_evening,wed_evening,fri_evening,sat_morning",
    lookingFor: "class-buddy,accountability",
  },
  {
    email: "kai.r" + DEMO_EMAIL_DOMAIN,
    name: "Kai Rivera",
    displayName: "Kai",
    gender: "male",
    showMeGenders: "female,male,non_binary",
    age: 22,
    dateOfBirth: yearsAgo(22),
    bio: "Student, training around classes. Bodybuilding split, hypertrophy focus.",
    gymName: "Carleton Athletics Centre",
    fitnessGoals: "muscle-gain",
    experienceLevel: "intermediate",
    gymSchedule: "tue_afternoon,thu_afternoon,sat_afternoon,sun_afternoon",
    lookingFor: "partner,spotter",
  },
  {
    email: "elena.k" + DEMO_EMAIL_DOMAIN,
    name: "Elena Kowalski",
    displayName: "Elena",
    gender: "female",
    showMeGenders: "female,non_binary,male",
    age: 37,
    dateOfBirth: yearsAgo(37),
    bio: "Back into training after a year off. Friendly, consistent, occasionally slow. Don't judge.",
    gymName: "Movati Athletic Orleans",
    fitnessGoals: "strength,flexibility",
    experienceLevel: "beginner",
    gymSchedule: "mon_morning,wed_morning,fri_morning",
    lookingFor: "accountability,partner",
  },
  {
    email: "noah.t" + DEMO_EMAIL_DOMAIN,
    name: "Noah Tremblay",
    displayName: "Noah",
    gender: "male",
    showMeGenders: "female,male,non_binary",
    age: 30,
    dateOfBirth: yearsAgo(30),
    bio: "Long runs Saturdays, gym Tues/Thurs. Looking for someone to actually keep me honest on rest weeks.",
    gymName: "Anytime Fitness Centretown",
    fitnessGoals: "cardio,strength",
    experienceLevel: "intermediate",
    gymSchedule: "tue_evening,thu_evening,sat_morning",
    lookingFor: "accountability,partner",
  },
];

const SAMPLE_CHAT = [
  {
    fromDemo: true,
    content:
      "Hey — saw we both train mornings at Goodlife. What days are you usually in this week?",
  },
  {
    fromDemo: false,
    content:
      "Tues and Thurs around 6:30am. Hitting squats Tuesday — looking for a spotter on the top set if you're around.",
  },
  {
    fromDemo: true,
    content:
      "I'll be there Tuesday. What's the working weight? I can warm up so we're on the same rack at the same time.",
  },
];

async function wipe() {
  console.log("Wiping demo content (matches, messages, meetups, RSVPs, demo users)...");
  await prisma.meetupRsvp.deleteMany({});
  await prisma.meetup.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.swipe.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.block.deleteMany({});
  await prisma.notification.deleteMany({});
  // Demo users only — preserve any human accounts.
  await prisma.user.deleteMany({
    where: { email: { endsWith: DEMO_EMAIL_DOMAIN } },
  });
}

async function main() {
  const args = process.argv.slice(2);
  const yes = args.includes("--yes") || args.includes("-y");
  if (!yes) {
    console.log("⚠️  This will delete all matches, messages, meetups, RSVPs,");
    console.log("   swipes, reports, blocks, notifications, and demo users.");
    console.log("   Non-demo (human) accounts are preserved.");
    console.log("");
    console.log("   Re-run with --yes to proceed:");
    console.log("     npm run seed:demo -- --yes");
    process.exit(0);
  }

  await wipe();

  // Pick the oldest human account as the demo target — they'll be paired with
  // the first three demo lifters as mutual matches.
  const primary = await prisma.user.findFirst({
    where: { NOT: { email: { endsWith: DEMO_EMAIL_DOMAIN } } },
    orderBy: { createdAt: "asc" },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log(`Creating ${DEMO_USERS.length} demo users...`);
  const created = [];
  for (const u of DEMO_USERS) {
    const coords = nearby();
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash,
        provider: "credentials",
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
    });
    created.push(user);
  }

  if (primary) {
    console.log(`Pairing first 3 demo lifters as matches with ${primary.email}...`);
    const pairWith = created.slice(0, 3);
    for (const demo of pairWith) {
      const [userAId, userBId] = [primary.id, demo.id].sort();
      // Both sides "like" each other.
      await prisma.swipe.create({
        data: { swiperId: primary.id, swipedId: demo.id, liked: true },
      });
      await prisma.swipe.create({
        data: { swiperId: demo.id, swipedId: primary.id, liked: true },
      });
      await prisma.match.create({ data: { userAId, userBId } });
    }

    // Plant a short clean chat in the first match so the matches list isn't
    // just a row of "New match — say hi."
    const firstMatch = await prisma.match.findFirst({
      where: { OR: [{ userAId: primary.id }, { userBId: primary.id }] },
      orderBy: { createdAt: "asc" },
    });
    if (firstMatch) {
      const otherId =
        firstMatch.userAId === primary.id
          ? firstMatch.userBId
          : firstMatch.userAId;
      console.log("Seeding sample chat in the first match...");
      // Spread the timestamps a few minutes apart so the conversation reads
      // chronologically rather than batched.
      const base = Date.now() - 60 * 60 * 1000;
      for (let i = 0; i < SAMPLE_CHAT.length; i++) {
        const msg = SAMPLE_CHAT[i];
        await prisma.message.create({
          data: {
            matchId: firstMatch.id,
            senderId: msg.fromDemo ? otherId : primary.id,
            content: msg.content,
            createdAt: new Date(base + i * 7 * 60 * 1000),
          },
        });
      }
    }
  } else {
    console.log(
      "No human account found — skipping match + chat seeding. Sign up first, then re-run."
    );
  }

  // Three upcoming meetups by three different hosts, each with a clean
  // description and a couple of attendees.
  console.log("Creating 3 upcoming meetups...");
  const now = new Date();
  const meetupSpecs = [
    {
      hostIdx: 0,
      title: "Squat-focused powerlifting",
      description: "Working up to a heavy single, bring a spotter mindset. 1.5 hrs.",
      sportTag: "powerlifting",
      location: "Goodlife Fitness Kanata",
      durationMins: 90,
      capacity: 3,
      daysAhead: 2,
      hour: 7,
    },
    {
      hostIdx: 1,
      title: "Easy 5K morning run",
      description: "Conversational pace along the river pathway. All paces welcome.",
      sportTag: "cardio",
      location: "Ottawa River Pathway — Westboro Beach",
      durationMins: 45,
      capacity: 8,
      daysAhead: 3,
      hour: 6,
    },
    {
      hostIdx: 3,
      title: "Hypertrophy push session",
      description: "Chest + shoulders, ~75 min, hit it then get out.",
      sportTag: "bodybuilding",
      location: "Goodlife Fitness Kanata",
      durationMins: 75,
      capacity: 4,
      daysAhead: 4,
      hour: 18,
    },
  ];

  for (const spec of meetupSpecs) {
    const host = created[spec.hostIdx];
    const scheduledAt = new Date(now);
    scheduledAt.setDate(now.getDate() + spec.daysAhead);
    scheduledAt.setHours(spec.hour, 0, 0, 0);

    const meetup = await prisma.meetup.create({
      data: {
        hostId: host.id,
        title: spec.title,
        description: spec.description,
        sportTag: spec.sportTag,
        location: spec.location,
        scheduledAt,
        durationMins: spec.durationMins,
        capacity: spec.capacity,
        status: "open",
      },
    });
    // Host's auto-RSVP.
    await prisma.meetupRsvp.create({
      data: { meetupId: meetup.id, userId: host.id, status: "going" },
    });
    // Two more attendees from the demo pool.
    for (let j = 1; j <= 2; j++) {
      const attendee = created[(spec.hostIdx + j) % created.length];
      if (attendee.id === host.id) continue;
      await prisma.meetupRsvp.create({
        data: {
          meetupId: meetup.id,
          userId: attendee.id,
          status: "going",
        },
      });
    }
  }

  console.log("");
  console.log("✓ Demo seed complete.");
  console.log(`  ${created.length} demo users created (password: ${DEMO_PASSWORD})`);
  if (primary) {
    console.log(`  3 matches paired with ${primary.email}`);
    console.log("  1 sample chat in the first match");
  }
  console.log("  3 upcoming meetups in the Community feed");
  console.log("");
  console.log("Open /, /matches, and /community to verify.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
