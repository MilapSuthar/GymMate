import { prisma } from "../../config/db";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { z } from "zod";

export const ReportSchema = z.object({
  reason: z.string().min(1).max(200),
  details: z.string().max(1000).optional(),
});

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new BadRequestError("Cannot block yourself");
  const target = await prisma.user.findUnique({ where: { id: blockedId } });
  if (!target) throw new NotFoundError("User not found");

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    create: { blockerId, blockedId },
    update: {},
  });

  // Deactivate any match between them
  const [a, b] = [blockerId, blockedId].sort();
  await prisma.match.updateMany({
    where: { OR: [{ userAId: a, userBId: b }, { userAId: b, userBId: a }] },
    data: { isActive: false },
  });

  return { blocked: true };
}

export async function reportUser(reporterId: string, reportedId: string, reason: string, details?: string) {
  if (reporterId === reportedId) throw new BadRequestError("Cannot report yourself");
  const target = await prisma.user.findUnique({ where: { id: reportedId } });
  if (!target) throw new NotFoundError("User not found");

  const report = await prisma.report.create({ data: { reporterId, reportedId, reason, details } });
  return report;
}
