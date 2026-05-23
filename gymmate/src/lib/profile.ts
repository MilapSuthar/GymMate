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

// Self-identified gender. Kept deliberately small + open-ended via "other"
// to avoid being prescriptive while still giving the matching pipeline
// something predictable to filter on.
export const GENDERS = ["male", "female", "non_binary", "other"] as const;
export type Gender = (typeof GENDERS)[number];

/** Inclusive minimum legal age for the app. Backed by an 18+ gate at signup. */
export const MIN_USER_AGE = 18;
export const MAX_USER_AGE = 99;

export const MAX_PHOTOS = 6;

// =====================
// GYM SCHEDULE — the overlap moat
// =====================
//
// Users tell us when they're typically at the gym; discover then ranks
// candidates by how many (day, slot) pairs they share with the viewer.
// Two lifters with 4+ shared slots cross paths in the wild — they're
// the matches that actually convert to real-life sessions, not just chats.

export const SCHEDULE_DAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

/**
 * Five buckets covers the day with enough granularity for matching without
 * making the grid painful to fill. Labels are display-only; the canonical
 * value used in storage is the slot key.
 */
export const SCHEDULE_SLOTS = [
  { key: "early", label: "Early", hint: "5–8a" },
  { key: "morning", label: "Morning", hint: "8–12" },
  { key: "afternoon", label: "Afternoon", hint: "12–5p" },
  { key: "evening", label: "Evening", hint: "5–9p" },
  { key: "late", label: "Late", hint: "9p–12a" },
] as const;
export type ScheduleSlotKey = (typeof SCHEDULE_SLOTS)[number]["key"];

/** Canonical token used in storage: e.g. "mon_morning". */
export type ScheduleToken = `${ScheduleDay}_${ScheduleSlotKey}`;

const VALID_TOKENS: Set<string> = (() => {
  const set = new Set<string>();
  for (const d of SCHEDULE_DAYS) {
    for (const s of SCHEDULE_SLOTS) set.add(`${d}_${s.key}`);
  }
  return set;
})();

/** Parse the persisted CSV into a typed array, dropping malformed tokens. */
export function parseSchedule(value: string | null | undefined): ScheduleToken[] {
  if (!value) return [];
  return value
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is ScheduleToken => VALID_TOKENS.has(t));
}

export function joinSchedule(tokens: ScheduleToken[]): string {
  const set = new Set(tokens);
  const sorted: string[] = [];
  for (const d of SCHEDULE_DAYS) {
    for (const s of SCHEDULE_SLOTS) {
      const t = `${d}_${s.key}` as ScheduleToken;
      if (set.has(t)) sorted.push(t);
    }
  }
  return sorted.join(",");
}

/**
 * Count of shared (day, slot) cells between two schedules. 0 = "would never
 * see each other"; the theoretical max is SCHEDULE_DAYS × SCHEDULE_SLOTS = 35.
 */
export function scheduleOverlap(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const setA = new Set(parseSchedule(a));
  if (setA.size === 0) return 0;
  let count = 0;
  for (const t of parseSchedule(b)) if (setA.has(t)) count++;
  return count;
}

/** Parse a comma-separated list of genders into a typed array. */
export function parseGenders(value: string | null | undefined): Gender[] {
  if (!value) return [];
  return value
    .split(",")
    .map((g) => g.trim())
    .filter((g): g is Gender => (GENDERS as readonly string[]).includes(g));
}

export function joinGenders(genders: Gender[]): string {
  return Array.from(new Set(genders)).join(",");
}

/** Compute age from a Date of birth. Returns null if DOB is null. */
export function ageFromDob(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
  return years;
}

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

/** Minimum number of schedule slots a user must pick to count as onboarded. */
export const MIN_ONBOARDING_SCHEDULE_SLOTS = 3;

/**
 * "Onboarded" is a stricter bar than "profile complete" — it's the gate that
 * decides whether a brand-new user has enough on their profile to get a
 * useful experience in the deck.
 */
export function isOnboarded(profile: {
  photos?: { id: string }[] | unknown[];
  photoUrl?: string | null;
  gender?: string | null;
  showMeGenders?: string[] | null;
  gymSchedule?: string[] | null;
}): boolean {
  const photoCount =
    (Array.isArray(profile.photos) ? profile.photos.length : 0) +
    (profile.photoUrl ? 1 : 0);
  if (photoCount === 0) return false;
  if (!profile.gender) return false;
  if (!profile.showMeGenders || profile.showMeGenders.length === 0) return false;
  if (
    !profile.gymSchedule ||
    profile.gymSchedule.length < MIN_ONBOARDING_SCHEDULE_SLOTS
  ) {
    return false;
  }
  return true;
}

/**
 * Public profile shape — strips email, passwordHash, googleId, provider, etc.
 */
export function publicProfile(user: User & { photos: UserPhoto[] }) {
  const computedAge = ageFromDob(user.dateOfBirth) ?? user.age;
  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    bio: user.bio,
    age: computedAge,
    gender: user.gender as Gender | null,
    showMeGenders: parseGenders(user.showMeGenders),
    minAgePref: user.minAgePref,
    maxAgePref: user.maxAgePref,
    gymName: user.gymName,
    fitnessGoals: parseGoals(user.fitnessGoals),
    experienceLevel: user.experienceLevel,
    gymSchedule: parseSchedule(user.gymSchedule),
    photoUrl: user.photoUrl,
    photos: user.photos
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ id: p.id, url: p.url, position: p.position })),
    createdAt: user.createdAt,
  };
}
