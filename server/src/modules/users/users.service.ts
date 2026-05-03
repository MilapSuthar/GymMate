import { prisma } from "../../config/db";
import { NotFoundError } from "../../lib/errors";
import { z } from "zod";

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gymName: z.string().max(100).optional(),
  goals: z.array(z.string()).optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, displayName: true, bio: true, avatarUrl: true,
      photos: true, gymName: true, goals: true, fitnessLevel: true,
      role: true, isVerified: true, dateOfBirth: true, createdAt: true,
    },
  });
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function updateMe(userId: string, input: UpdateProfileInput) {
  const { lat, lng, dateOfBirth, ...rest } = input;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...rest,
      ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
    },
    select: {
      id: true, email: true, displayName: true, bio: true, avatarUrl: true,
      photos: true, gymName: true, goals: true, fitnessLevel: true, role: true,
    },
  });

  if (lat !== undefined && lng !== undefined) {
    await prisma.$executeRaw`
      UPDATE users SET gym_location = ST_MakePoint(${lng}, ${lat})::geography
      WHERE id = ${userId}::uuid
    `;
  }

  return user;
}

export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: {
      id: true, displayName: true, bio: true, avatarUrl: true,
      photos: true, gymName: true, goals: true, fitnessLevel: true,
    },
  });
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function deletePhoto(userId: string, index: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { photos: true } });
  if (!user) throw new NotFoundError("User not found");
  const photos = user.photos.filter((_, i) => i !== index);
  return prisma.user.update({ where: { id: userId }, data: { photos }, select: { photos: true } });
}
