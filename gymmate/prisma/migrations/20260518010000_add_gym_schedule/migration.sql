-- Gym schedule for overlap-based discover ranking (the GymMate wedge).
-- Stored as comma-separated `day_slot` tokens, where day ∈ {mon..sun}
-- and slot ∈ {early, morning, afternoon, evening, late}.
ALTER TABLE "User" ADD COLUMN "gymSchedule" TEXT;
