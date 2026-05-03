import http from "http";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/db";
import { redis } from "./config/redis";
import { createSocketServer } from "./realtime/socket";
import { initSentry } from "./lib/sentry";
import { logger } from "./lib/logger";

initSentry();

const server = http.createServer(app);
createSocketServer(server);

async function start() {
  await redis.connect();
  await prisma.$connect();

  server.listen(env.PORT, () => {
    logger.info(`GymMate server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

start().catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
