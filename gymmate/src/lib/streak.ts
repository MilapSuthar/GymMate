import { prisma } from "@/lib/db";

/** UTC day index for a date — whole days since the epoch. */
function dayIndex(d: Date): number {
  return Math.floor(d.getTime() / 86_400_000);
}

export interface StreakState {
  /** Consecutive UTC days the user has been active, including today. */
  streakCount: number;
}

/**
 * Record that `userId` was active today and return their streak.
 *
 * Streak rules (UTC day boundaries):
 *   - already counted today        → unchanged
 *   - last active yesterday        → +1
 *   - any larger gap, or first use → reset to 1
 *
 * Best-effort: never throws. On a DB error the caller still gets a sane
 * zeroed result rather than a failed request — a streak counter is a
 * gamification nicety, never a reason to break the app.
 */
export async function touchStreak(userId: string): Promise<StreakState> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streakCount: true, lastActiveOn: true },
    });
    if (!user) return { streakCount: 0 };

    const today = dayIndex(new Date());
    const last = user.lastActiveOn ? dayIndex(user.lastActiveOn) : null;

    // Already counted today — return the stored value untouched.
    if (last === today) return { streakCount: user.streakCount };

    // Yesterday → extend the run; anything else → start a new run at 1.
    const nextCount = last === today - 1 ? user.streakCount + 1 : 1;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { streakCount: nextCount, lastActiveOn: new Date() },
      select: { streakCount: true },
    });
    return { streakCount: updated.streakCount };
  } catch {
    return { streakCount: 0 };
  }
}
