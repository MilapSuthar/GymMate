import type { User, UserPhoto } from "@prisma/client";

export const FITNESS_GOALS = [
  "strength",
  "cardio",
  "weight-loss",
  "muscle-gain",
  "flexibility",
] as const;
export type FitnessGoal = (typeof FITNESS_GOALS)[number];

export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const MAX_PHOTOS = 6;

export function parseGoals(value: string | null | undefined): FitnessGoal[] {
  if (!value) return [];
  return value
    .split(",")
    .map((g) => g.trim())
    .filter((g): g is FitnessGoal => (FITNESS_GOALS as readonly string[]).includes(g));
}

export function joinGoals(goals: FitnessGoal[]): string {
  return Array.from(new Set(goals)).join(",");
}

/**
 * "Profile complete" = has a bio AND at least one photo. This is the rule the
 * /match completion banner uses to decide whether to nag the user.
 */
export function isProfileComplete(
  user: Pick<User, "bio">,
  photos: Pick<UserPhoto, "id">[]
): boolean {
  return !!user.bio && user.bio.trim().length > 0 && photos.length > 0;
}

/**
 * Public profile shape — strips email, passwordHash, googleId, provider, etc.
 * This is what GET /api/profile/[userId] returns.
 */
export function publicProfile(
  user: User & { photos: UserPhoto[] }
) {
  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    bio: user.bio,
    age: user.age,
    gymName: user.gymName,
    fitnessGoals: parseGoals(user.fitnessGoals),
    experienceLevel: user.experienceLevel,
    photoUrl: user.photoUrl,
    photos: user.photos
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ id: p.id, url: p.url, position: p.position })),
    createdAt: user.createdAt,
  };
}
