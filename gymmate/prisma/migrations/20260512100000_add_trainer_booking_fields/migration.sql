-- Add tags to TrainerProfile
ALTER TABLE "TrainerProfile" ADD COLUMN "tags" TEXT;

-- Add booking enhancements
ALTER TABLE "Booking" ADD COLUMN "durationMins" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "notes" TEXT;
ALTER TABLE "Booking" ADD COLUMN "paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "stripeSessionId" TEXT;
