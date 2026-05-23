-- Daily-streak gamification: a consecutive-day activity counter shown in the
-- top bar. `streakCount` is the current run length; `lastActiveOn` is the last
-- UTC day counted, used to decide whether the next visit extends or resets it.
ALTER TABLE "User" ADD COLUMN "streakCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastActiveOn" DATETIME;
