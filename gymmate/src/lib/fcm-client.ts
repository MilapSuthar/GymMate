"use client";

import { getMessaging, getToken, type Messaging } from "firebase/messaging";
import { isFirebaseConfigured } from "@/lib/firebase-client";

let messaging: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!isFirebaseConfigured()) return null;
  if (!("Notification" in window)) return null;
  if (messaging) return messaging;

  const { initializeApp, getApps } = await import("firebase/app");
  const app = getApps()[0] ?? initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  });

  messaging = getMessaging(app);
  return messaging;
}

/**
 * Requests browser notification permission and retrieves an FCM device token.
 * Returns null if permission is denied, Firebase isn't configured, or the
 * browser doesn't support service workers / notifications.
 */
export async function requestFcmToken(): Promise<string | null> {
  try {
    if (typeof window === "undefined") return null;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const m = await getMessagingInstance();
    if (!m) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(m, vapidKey ? { vapidKey } : undefined);
    return token || null;
  } catch (err) {
    console.warn("[fcm-client] Could not get FCM token:", err);
    return null;
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function notificationsGranted(): boolean {
  return notificationsSupported() && Notification.permission === "granted";
}
