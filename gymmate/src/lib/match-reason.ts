import { LOOKING_FOR_LABELS, type LookingFor } from "@/lib/profile";

/**
 * Strict array intersection — returns the items from `a` that also appear in
 * `b`, preserving order from `a`. Cheap (single Set lookup), no dependency
 * on lodash or similar. Used to compute shared `lookingFor` tags and
 * shared fitness goals between two profiles.
 */
export function intersect<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

export interface WhyMatchedSignals {
  sharedLookingFor: LookingFor[];
  sharedGoals: string[];
  /** Schedule-overlap count: how many (day, slot) cells they share. */
  overlap: number;
  /** True if both users' free-text gymName matches. */
  sameGym: boolean;
  /** Computed haversine km between users (null when coords unknown). */
  distanceKm: number | null;
}

/**
 * Heuristic "why these two would be a fit" headline. Picks the single
 * strongest signal we can see and writes it as one short string for any
 * surface that wants a glanceable reason — the matches list, the Match
 * deck card, future place cards.
 *
 * Order matters: explicit intent (lookingFor) beats inferred signals
 * (overlap), and "same gym" beats raw distance because users care that they
 * would actually run into each other, not just that they live close.
 */
export function whyMatched(s: WhyMatchedSignals): string {
  if (s.sharedLookingFor.length > 0) {
    const label =
      LOOKING_FOR_LABELS[s.sharedLookingFor[0]] ?? s.sharedLookingFor[0];
    return `Both looking for a ${label.toLowerCase()}`;
  }
  if (s.overlap >= 3) {
    return `${s.overlap} weekly time slots overlap`;
  }
  if (s.sameGym) {
    return "Same gym";
  }
  if (s.distanceKm != null && s.distanceKm < 2) {
    return `Just ${s.distanceKm.toFixed(1)} km apart`;
  }
  if (s.overlap >= 1) {
    return `${s.overlap} weekly time slot overlap`;
  }
  if (s.sharedGoals.length > 0) {
    return `Both into ${s.sharedGoals[0].replace("-", " ")}`;
  }
  return "Recent mutual like";
}
