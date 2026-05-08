import { prisma } from "../../config/db";
import { NotFoundError, BadRequestError } from "../../lib/errors";

export async function recordSwipe(swiperId: string, swipedId: string, direction: "like" | "pass") {
  if (swiperId === swipedId) throw new BadRequestError("Cannot swipe on yourself");

  const target = await prisma.user.findUnique({ where: { id: swipedId, isActive: true } });
  if (!target) throw new NotFoundError("User not found");

  await prisma.swipe.upsert({
    where: { swiperId_swipedId: { swiperId, swipedId } },
    create: { swiperId, swipedId, direction },
    update: { direction },
  });

  if (direction !== "like") return { matched: false };

  // Check for mutual like
  const mutual = await prisma.swipe.findUnique({
    where: { swiperId_swipedId: { swiperId: swipedId, swipedId: swiperId } },
  });

  if (!mutual || mutual.direction !== "like") return { matched: false };

  // Ensure consistent ordering: smaller UUID is userA
  const [userAId, userBId] = [swiperId, swipedId].sort();

  const match = await prisma.match.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
  });

  return { matched: true, matchId: match.id };
}
