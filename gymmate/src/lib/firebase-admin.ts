import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

/**
 * Lazily initialize firebase-admin. Reads service account credentials from env:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY  (literal newlines must be escaped as \n in env)
 *
 * Throws a descriptive error if credentials are missing — keeps server boot
 * cheap when the Google route is never hit.
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

export interface VerifiedGoogleUser {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  const decoded = await getFirebaseAdmin().auth().verifyIdToken(idToken);
  if (!decoded.email) {
    throw new Error("Google account has no email");
  }
  return {
    uid: decoded.uid,
    email: decoded.email,
    name: (decoded.name as string | undefined) ?? decoded.email.split("@")[0],
    picture: decoded.picture as string | undefined,
  };
}
