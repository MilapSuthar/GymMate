import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  await prisma.user.upsert({
    where: { email: "admin@gymmate.app" },
    update: {},
    create: {
      email: "admin@gymmate.app",
      passwordHash,
      role: "admin",
      displayName: "GymMate Admin",
      isVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "demo@gymmate.app" },
    update: {},
    create: {
      email: "demo@gymmate.app",
      passwordHash,
      role: "user",
      displayName: "Demo User",
      bio: "Just here to lift heavy things.",
      gymName: "PureGym City Centre",
      goals: ["build_muscle", "general_fitness"],
      fitnessLevel: "intermediate",
      isVerified: true,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
