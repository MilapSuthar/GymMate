#!/usr/bin/env node
/**
 * Seed script — 31 exercises across 7 muscle groups.
 * Run: node --env-file=.env prisma/seed.mjs
 * Or:  npx prisma db seed   (if package.json prisma.seed is set)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const exercises = [
  // ── CHEST (push) ────────────────────────────────────────────────────────
  {
    name: "Barbell Bench Press",
    muscleGroup: "chest",
    category: "push",
    difficulty: "intermediate",
    equipment: "Barbell, Bench",
    description:
      "Lie on a flat bench with a shoulder-width grip. Lower the bar under control to mid-chest, then press back up to lockout. The king of upper-body pressing.",
    videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
  },
  {
    name: "Incline Dumbbell Press",
    muscleGroup: "chest",
    category: "push",
    difficulty: "intermediate",
    equipment: "Dumbbells, Incline Bench",
    description:
      "Set the bench to 30–45°. Press the dumbbells from shoulder level up and together, emphasising the upper chest and front deltoid.",
    videoUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
  },
  {
    name: "Cable Flye",
    muscleGroup: "chest",
    category: "push",
    difficulty: "beginner",
    equipment: "Cable Machine",
    description:
      "Stand between two cable stations set at chest height. Draw your hands together in a hugging arc, keeping a slight elbow bend throughout.",
    videoUrl: "https://www.youtube.com/watch?v=WEM9FCIPlxQ",
  },
  {
    name: "Push-Up",
    muscleGroup: "chest",
    category: "push",
    difficulty: "beginner",
    equipment: "None",
    description:
      "Assume a high-plank position, hands slightly wider than shoulder-width. Lower your chest to the floor while keeping your body rigid, then push back up.",
    videoUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4",
  },
  {
    name: "Dip",
    muscleGroup: "chest",
    category: "push",
    difficulty: "intermediate",
    equipment: "Dip Bars",
    description:
      "Support yourself on parallel bars. Lean slightly forward, lower until elbows reach 90°, then press back up. Lean more for chest; stay upright for triceps.",
    videoUrl: "https://www.youtube.com/watch?v=2z8JmcrW-As",
  },

  // ── BACK (pull) ──────────────────────────────────────────────────────────
  {
    name: "Pull-Up",
    muscleGroup: "back",
    category: "pull",
    difficulty: "intermediate",
    equipment: "Pull-Up Bar",
    description:
      "Hang from a bar with an overhand grip, hands slightly wider than shoulder-width. Pull until chin clears the bar, lower with control.",
    videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g",
  },
  {
    name: "Barbell Bent-Over Row",
    muscleGroup: "back",
    category: "pull",
    difficulty: "intermediate",
    equipment: "Barbell",
    description:
      "Hinge at the hips with a flat back, torso roughly parallel to the floor. Pull the bar to your lower ribcage, drive your elbows past your torso.",
    videoUrl: "https://www.youtube.com/watch?v=FWJR5Ve8bnQ",
  },
  {
    name: "Lat Pulldown",
    muscleGroup: "back",
    category: "pull",
    difficulty: "beginner",
    equipment: "Cable Machine",
    description:
      "Grip the bar wider than shoulder-width, sit tall and brace. Pull to your upper chest while keeping the torso nearly upright.",
    videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
  },
  {
    name: "Seated Cable Row",
    muscleGroup: "back",
    category: "pull",
    difficulty: "beginner",
    equipment: "Cable Machine",
    description:
      "Sit upright with a neutral grip. Pull the handle to your lower abdomen, driving your elbows back and squeezing your shoulder blades together.",
    videoUrl: "https://www.youtube.com/watch?v=GZbfZ033f74",
  },
  {
    name: "Face Pull",
    muscleGroup: "back",
    category: "pull",
    difficulty: "beginner",
    equipment: "Cable Machine, Rope",
    description:
      "Set the pulley at forehead height. Pull the rope to your face with elbows flared high, externally rotating at the top. Great for shoulder health.",
    videoUrl: "https://www.youtube.com/watch?v=rep-qVOkqgk",
  },

  // ── LEGS ─────────────────────────────────────────────────────────────────
  {
    name: "Back Squat",
    muscleGroup: "legs",
    category: "legs",
    difficulty: "intermediate",
    equipment: "Barbell, Squat Rack",
    description:
      "Bar rests on your upper traps. Feet shoulder-width, toes slightly out. Squat until thighs are parallel (or below) to the floor, then drive through your heels.",
    videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8",
  },
  {
    name: "Romanian Deadlift",
    muscleGroup: "legs",
    category: "legs",
    difficulty: "intermediate",
    equipment: "Barbell",
    description:
      "Hold the bar at hip level with a hip-width stance. Hinge back, pushing your hips rearward while keeping shins vertical, until you feel a deep hamstring stretch.",
    videoUrl: "https://www.youtube.com/watch?v=JCXUYuzwNrM",
  },
  {
    name: "Leg Press",
    muscleGroup: "legs",
    category: "legs",
    difficulty: "beginner",
    equipment: "Leg Press Machine",
    description:
      "Feet shoulder-width on the platform. Lower the sled until knees reach 90°, press back up without fully locking out. Adjust foot position to bias quads or glutes.",
    videoUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
  },
  {
    name: "Walking Lunge",
    muscleGroup: "legs",
    category: "legs",
    difficulty: "beginner",
    equipment: "Dumbbells",
    description:
      "Step forward into a lunge, lower the rear knee toward the floor, then drive off the front foot to bring the rear leg forward for the next rep.",
    videoUrl: "https://www.youtube.com/watch?v=L8fvypPrzzs",
  },
  {
    name: "Leg Curl",
    muscleGroup: "legs",
    category: "legs",
    difficulty: "beginner",
    equipment: "Leg Curl Machine",
    description:
      "Lie prone on the machine with the pad just above your heels. Curl your heels toward your glutes through the full range of motion, squeeze at the top.",
    videoUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
  },
  {
    name: "Calf Raise",
    muscleGroup: "legs",
    category: "legs",
    difficulty: "beginner",
    equipment: "Calf Raise Machine",
    description:
      "Stand with the balls of your feet on a raised surface. Rise as high as possible onto your toes, hold briefly, then lower slowly for a full stretch.",
    videoUrl: "https://www.youtube.com/watch?v=-M4-G8p1fCI",
  },

  // ── SHOULDERS (push/pull) ────────────────────────────────────────────────
  {
    name: "Overhead Press",
    muscleGroup: "shoulders",
    category: "push",
    difficulty: "intermediate",
    equipment: "Barbell",
    description:
      "Press a barbell from collarbone level straight overhead to full lockout. Brace your core and glutes to prevent lumbar hyperextension.",
    videoUrl: "https://www.youtube.com/watch?v=2yjwXTZQDDI",
  },
  {
    name: "Dumbbell Lateral Raise",
    muscleGroup: "shoulders",
    category: "push",
    difficulty: "beginner",
    equipment: "Dumbbells",
    description:
      "Raise dumbbells to the side until arms reach shoulder height, thumbs angled slightly down. Control the descent — the eccentric builds the most mass.",
    videoUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
  },
  {
    name: "Arnold Press",
    muscleGroup: "shoulders",
    category: "push",
    difficulty: "intermediate",
    equipment: "Dumbbells",
    description:
      "Start with dumbbells at shoulder level, palms facing you. Rotate palms outward as you press overhead. Targets all three deltoid heads in one movement.",
    videoUrl: "https://www.youtube.com/watch?v=6Z15_WdXmVw",
  },
  {
    name: "Rear Delt Fly",
    muscleGroup: "shoulders",
    category: "pull",
    difficulty: "beginner",
    equipment: "Dumbbells",
    description:
      "Hinge forward at the hips, raise dumbbells to the side with a slight elbow bend. Targets the posterior deltoid — often underdeveloped and important for posture.",
    videoUrl: "https://www.youtube.com/watch?v=EA7u4Q_8HQ0",
  },

  // ── ARMS (pull/push) ─────────────────────────────────────────────────────
  {
    name: "Barbell Bicep Curl",
    muscleGroup: "arms",
    category: "pull",
    difficulty: "beginner",
    equipment: "Barbell",
    description:
      "Stand with a shoulder-width underhand grip. Curl from full extension to peak contraction, keeping your elbows stationary at your sides.",
    videoUrl: "https://www.youtube.com/watch?v=kwG2ipFRgfo",
  },
  {
    name: "Hammer Curl",
    muscleGroup: "arms",
    category: "pull",
    difficulty: "beginner",
    equipment: "Dumbbells",
    description:
      "Neutral (thumbs-up) grip dumbbell curl. Emphasises the brachialis and brachioradialis in addition to the bicep, adding arm thickness.",
    videoUrl: "https://www.youtube.com/watch?v=TwD-YGVP4Bk",
  },
  {
    name: "Tricep Pushdown",
    muscleGroup: "arms",
    category: "push",
    difficulty: "beginner",
    equipment: "Cable Machine",
    description:
      "Grip a bar or rope at a high cable station. Push from chin height to full lockout, keeping elbows tucked tightly to your sides.",
    videoUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU",
  },
  {
    name: "Skull Crusher",
    muscleGroup: "arms",
    category: "push",
    difficulty: "intermediate",
    equipment: "EZ Bar, Bench",
    description:
      "Lie on a bench, hold an EZ bar above your chest. Hinge only at the elbows, lower the bar toward your forehead, then extend back to lockout.",
    videoUrl: "https://www.youtube.com/watch?v=d_KZxkY_0cM",
  },
  {
    name: "Preacher Curl",
    muscleGroup: "arms",
    category: "pull",
    difficulty: "beginner",
    equipment: "EZ Bar, Preacher Bench",
    description:
      "Rest upper arms flat on the preacher pad. Curl from full extension to peak contraction — the pad eliminates momentum for maximum bicep isolation.",
    videoUrl: "https://www.youtube.com/watch?v=fIWP-FRFNU0",
  },

  // ── CORE ────────────────────────────────────────────────────────────────
  {
    name: "Plank",
    muscleGroup: "core",
    category: "push",
    difficulty: "beginner",
    equipment: "None",
    description:
      "Hold a forearm push-up position with your body in a straight line from head to heels. Brace your abs as if bracing for a punch — don't sag or pike.",
    videoUrl: "https://www.youtube.com/watch?v=pSHjTRCQxIw",
  },
  {
    name: "Cable Crunch",
    muscleGroup: "core",
    category: "pull",
    difficulty: "beginner",
    equipment: "Cable Machine, Rope",
    description:
      "Kneel facing a high pulley. Hold the rope at your temples and crunch your rib cage toward your pelvis — NOT a hip-hinge. Allows progressive loading.",
    videoUrl: "https://www.youtube.com/watch?v=2fbujeH3F0E",
  },
  {
    name: "Hanging Leg Raise",
    muscleGroup: "core",
    category: "pull",
    difficulty: "intermediate",
    equipment: "Pull-Up Bar",
    description:
      "Hang from a bar with a shoulder-width grip. Raise straight legs to 90° or higher using hip flexors and lower abs, lower with full control.",
    videoUrl: "https://www.youtube.com/watch?v=Pr1ieGZ5atk",
  },
  {
    name: "Russian Twist",
    muscleGroup: "core",
    category: "push",
    difficulty: "beginner",
    equipment: "Plate or Dumbbell",
    description:
      "Sit with your torso at 45° and feet off the floor. Rotate a weight from side to side, keeping your spine tall. Targets the obliques.",
    videoUrl: "https://www.youtube.com/watch?v=wkD8rjkodUI",
  },
  {
    name: "Dead Bug",
    muscleGroup: "core",
    category: "push",
    difficulty: "beginner",
    equipment: "None",
    description:
      "Lie on your back, arms toward the ceiling, knees at 90°. Slowly lower opposite arm and leg simultaneously while keeping your lower back pressed flat.",
    videoUrl: "https://www.youtube.com/watch?v=4XLEnwUr1d8",
  },

  // ── CARDIO ───────────────────────────────────────────────────────────────
  {
    name: "Treadmill Run",
    muscleGroup: "cardio",
    category: "cardio",
    difficulty: "beginner",
    equipment: "Treadmill",
    description:
      "Sustained aerobic running. Use the incline for added intensity. Target 30–60 minutes at a conversational pace for base building, or intervals for fat loss.",
    videoUrl: "https://www.youtube.com/watch?v=9L2b2khySLE",
  },
];

async function main() {
  const existing = await prisma.exercise.count();
  if (existing > 0) {
    console.log(`Already seeded (${existing} exercises). Skipping.`);
    return;
  }
  console.log(`Seeding ${exercises.length} exercises…`);
  await prisma.exercise.createMany({ data: exercises });
  const total = await prisma.exercise.count();
  console.log(`Done. ${total} exercises in the database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
