import { prisma } from "../../config/db";
import { logger } from "../../lib/logger";
import { env } from "../../config/env";

let firebaseAdmin: typeof import("firebase-admin") | null = null;

async function getFirebaseAdmin() {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return null;
  if (firebaseAdmin) return firebaseAdmin;
  const admin = await import("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)),
    });
  }
  firebaseAdmin = admin;
  return admin;
}

export async function sendPushNotification(userId: string, title: string, body: string, data?: Record<string, string>) {
  const tokens = await prisma.deviceToken.findMany({
    where: { userId },
    select: { token: true, platform: true },
  });

  if (!tokens.length) return;

  for (const { token, platform } of tokens) {
    try {
      if (platform === "android") {
        const admin = await getFirebaseAdmin();
        if (!admin) continue;
        await admin.messaging().send({ token, notification: { title, body }, data });
      }
      // iOS APNs would go here
    } catch (err) {
      logger.warn({ err, userId, token }, "Push notification failed");
    }
  }
}

export async function registerDeviceToken(userId: string, token: string, platform: "ios" | "android") {
  return prisma.deviceToken.upsert({
    where: { userId_token: { userId, token } },
    create: { userId, token, platform },
    update: {},
  });
}

export async function unregisterDeviceToken(userId: string, token: string) {
  await prisma.deviceToken.deleteMany({ where: { userId, token } });
}
