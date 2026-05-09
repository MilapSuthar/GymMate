import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

/**
 * Lazily initialize firebase-admin. Reads service account credentials from env:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY  (literal newlines must be escaped as \n in env)
 *
 * Throws a descriptive error if credentials are missing — keeps server boot
 * cheap when no OAuth route is hit.
 */
export function getFirebaseAdmin(): admin.app.App {
  if (app) return app;
  if (admin.apps.length > 0) {
    app = admin.app();
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase admin not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY."
    );
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

export type AuthProvider = "google" | "apple" | "credentials";

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  // Which underlying provider Firebase used. Comes from the
  // `firebase.sign_in_provider` claim on the ID token.
  provider: AuthProvider;
}

function classifyProvider(signInProvider: string | undefined): AuthProvider {
  if (signInProvider === "google.com") return "google";
  if (signInProvider === "apple.com") return "apple";
  return "credentials";
}

/**
 * Verify a Firebase ID token from any provider (Google, Apple, etc.).
 * Returns the canonical user info plus which provider Firebase used.
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedFirebaseUser> {
  const decoded = await getFirebaseAdmin().auth().verifyIdToken(idToken);
  if (!decoded.email) {
    // Apple lets users hide their email and Firebase will sometimes return
    // a relay email; if neither exists the token is unusable for our flow.
    throw new Error("OAuth account has no email");
  }
  const signInProvider = (decoded.firebase as { sign_in_provider?: string } | undefined)
    ?.sign_in_provider;
  return {
    uid: decoded.uid,
    email: decoded.email,
    name: (decoded.name as string | undefined) ?? decoded.email.split("@")[0],
    picture: decoded.picture as string | undefined,
    provider: classifyProvider(signInProvider),
  };
}

/** @deprecated Use {@link verifyFirebaseIdToken} — same behavior, provider-aware return type. */
export const verifyGoogleIdToken = verifyFirebaseIdToken;
