import { prisma } from "@/lib/db";

export type NotificationType = "new_match" | "new_message" | "new_answer";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Always persists a Notification row so the in-app bell works without
 * FCM credentials. Attempts to send via Firebase Cloud Messaging only when
 * the recipient has registered a device token AND Firebase Admin is
 * configured. Any FCM failure is logged but never throws — push delivery
 * is best-effort, not transactional with the action that triggered it.
 */
export async function sendNotification({
  userId,
  type,
  title,
  body,
  data,
}: NotifyInput): Promise<{ persisted: boolean; pushed: boolean }> {
  // 1. Persist for the in-app bell (always; survives FCM failures)
  await prisma.notification
    .create({
      data: {
        userId,
        type,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
      },
    })
    .catch((err) => {
      console.error("[notifications] Failed to persist notification", err);
    });

  // 2. Best-effort push via FCM
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });

  if (!user?.fcmToken) {
    return { persisted: true, pushed: false };
  }

  try {
    const { getFirebaseAdmin } = await import("@/lib/firebase-admin");
    const app = getFirebaseAdmin();
    const messaging = app.messaging();

    await messaging.send({
      token: user.fcmToken,
      notification: { title, body },
      data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
    });

    return { persisted: true, pushed: true };
  } catch (err) {
    // Common failures: Firebase not configured, expired token, network error.
    // Log and move on — the user can still see the notification in the bell.
    console.warn(
      "[notifications] FCM send failed (logged, not thrown):",
      err instanceof Error ? err.message : err
    );
    return { persisted: true, pushed: false };
  }
}
