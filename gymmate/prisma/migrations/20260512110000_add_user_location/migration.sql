-- Add user geolocation fields
ALTER TABLE "User" ADD COLUMN "latitude" REAL;
ALTER TABLE "User" ADD COLUMN "longitude" REAL;
