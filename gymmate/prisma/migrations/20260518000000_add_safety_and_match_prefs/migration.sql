-- Safety models (Report, Block) and Match preferences (gender, showMe, age range, DOB)

-- 1) New User columns. SQLite supports ADD COLUMN with nullable types only,
--    which is fine — every new column is nullable.
ALTER TABLE "User" ADD COLUMN "dateOfBirth" DATETIME;
ALTER TABLE "User" ADD COLUMN "gender" TEXT;
ALTER TABLE "User" ADD COLUMN "showMeGenders" TEXT;
ALTER TABLE "User" ADD COLUMN "minAgePref" INTEGER;
ALTER TABLE "User" ADD COLUMN "maxAgePref" INTEGER;

-- 2) Report — moderation queue
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "context" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "Report_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE INDEX "Report_reportedId_idx" ON "Report"("reportedId");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- 3) Block — keeps a blocker from seeing or being matched with a blocked user
CREATE TABLE "Block" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");
