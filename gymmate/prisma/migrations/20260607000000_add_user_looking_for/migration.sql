-- Match-by-intent: what kind of gym partner the user is looking for.
-- Comma-separated tokens from a canonical set ("partner", "spotter",
-- "class-buddy", "accountability"). Discover ranks/filters candidates whose
-- lookingFor intersects the viewer's, so two people looking for the same
-- role find each other instead of being matched purely on proximity.
ALTER TABLE "User" ADD COLUMN "lookingFor" TEXT;
