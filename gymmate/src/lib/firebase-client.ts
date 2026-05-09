"use client";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  type AuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  getAuth,
  signInWithPopup,
} from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // optional but commonly used:
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Firebase web SDK is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY, " +
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, " +
        "and NEXT_PUBLIC_FIREBASE_APP_ID in .env.local"
    );
    this.name = "FirebaseNotConfiguredError";
  }
}

export function isFirebaseConfigured(): boolean {
  return !!(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  if (!isFirebaseConfigured()) throw new FirebaseNotConfiguredError();
  app = getApps()[0] ?? initializeApp(config as Record<string, string>);
  auth = getAuth(app);
  return auth;
}

export type SocialProviderName = "google" | "apple";

function makeProvider(name: SocialProviderName): AuthProvider {
  if (name === "google") {
    const p = new GoogleAuthProvider();
    p.addScope("email");
    p.addScope("profile");
    return p;
  }
  // Apple is an OIDC provider; configured at apple.com on the Firebase side
  const p = new OAuthProvider("apple.com");
  p.addScope("email");
  p.addScope("name");
  return p;
}

/**
 * Run the popup OAuth flow and return the Firebase ID token. The caller
 * exchanges this token for our session via POST /api/auth/firebase.
 *
 * Throws FirebaseNotConfiguredError if env vars are missing — the UI uses
 * this to show a "coming soon" toast for Apple while Google works.
 */
export async function signInWithProvider(name: SocialProviderName): Promise<string> {
  const auth = getFirebaseAuth();
  const provider = makeProvider(name);
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}
