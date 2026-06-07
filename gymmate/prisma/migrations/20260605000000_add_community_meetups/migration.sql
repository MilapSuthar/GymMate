-- Community / Meetups: the V1 Meetup post type and RSVP tracking.
-- A Meetup is a time-bound event ("Powerlifting Saturday 10am at Goodlife
-- Kanata, looking for 3 people"). RSVPs are the "tick" — the action that
-- turns the community feed into a coordination tool. The `checkedIn` flag on
-- the RSVP row flips true post-event and drives the weekly co-attended
-- sessions stat that anchors the Profile.

-- ---------- Meetup ----------
CREATE TABLE "Meetup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sportTag" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "gymId" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "scheduledAt" DATETIME NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 60,
    "capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Meetup_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Meetup_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Meetup_scheduledAt_idx" ON "Meetup"("scheduledAt");
CREATE INDEX "Meetup_hostId_scheduledAt_idx" ON "Meetup"("hostId", "scheduledAt");
CREATE INDEX "Meetup_sportTag_scheduledAt_idx" ON "Meetup"("sportTag", "scheduledAt");

-- ---------- MeetupRsvp ----------
CREATE TABLE "MeetupRsvp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'going',
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeetupRsvp_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "Meetup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeetupRsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MeetupRsvp_meetupId_userId_key" ON "MeetupRsvp"("meetupId", "userId");
CREATE INDEX "MeetupRsvp_userId_checkedIn_idx" ON "MeetupRsvp"("userId", "checkedIn");
