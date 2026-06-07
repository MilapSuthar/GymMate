// Canonical sport / training-focus tags offered in the Meetup create form.
// Kept short so the Community feed stays scannable. The schema column is a
// free String, so the community can invent extras in the future — these are
// just the curated defaults the UI suggests.
export const SPORT_TAGS = [
  "strength",
  "powerlifting",
  "bodybuilding",
  "cardio",
  "mobility",
  "calisthenics",
  "other",
] as const;

export type SportTag = (typeof SPORT_TAGS)[number];

export const MIN_DURATION_MINS = 30;
export const MAX_DURATION_MINS = 240;
export const MIN_CAPACITY = 2;
export const MAX_CAPACITY = 50;
