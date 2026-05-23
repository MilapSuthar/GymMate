-- Add readAt for unread tracking
ALTER TABLE "Message" ADD COLUMN "readAt" DATETIME;

-- Indexes for chat history pagination and unread-count queries
CREATE INDEX "Message_matchId_createdAt_idx" ON "Message"("matchId", "createdAt");
CREATE INDEX "Message_matchId_senderId_readAt_idx" ON "Message"("matchId", "senderId", "readAt");
