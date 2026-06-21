-- Trust signal: per-user verified flag. Renders as a sky-blue check pill
-- everywhere the user's name appears. Defaults to false; the actual
-- selfie-verification flow lands in V1.2 — the column exists from day one so
-- the badge surface is built once.
ALTER TABLE "User" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;
