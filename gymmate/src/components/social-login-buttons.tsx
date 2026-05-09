"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth, AuthApiError } from "@/context/AuthContext";
import { FirebaseNotConfiguredError } from "@/lib/firebase-client";

type Provider = "google" | "apple";

/**
 * Google + Apple sign-in buttons. Both go through Firebase Auth so the
 * backend has one ID-token verifier. Apple is wired but currently disabled
 * at the Firebase level until the Apple Developer setup is done — when the
 * user clicks it we surface a "coming soon" message instead of a stack trace.
 */
export default function SocialLoginButtons({ nextHref = "/" }: { nextHref?: string }) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(p: Provider) {
    if (pending) return;
    setPending(p);
    setError(null);
    try {
      if (p === "google") await signInWithGoogle();
      else await signInWithApple();
      router.replace(nextHref);
    } catch (err) {
      setError(messageFor(p, err));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 my-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={() => run("google")}
        disabled={!!pending}
        data-testid="signin-google"
        className="flex items-center justify-center gap-2 h-10 px-3 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
      >
        {pending === "google" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => run("apple")}
        disabled={!!pending}
        data-testid="signin-apple"
        className="flex items-center justify-center gap-2 h-10 px-3 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
      >
        {pending === "apple" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <AppleIcon />
        )}
        Continue with Apple
      </button>

      {error && (
        <p
          role="alert"
          data-testid="social-error"
          className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function messageFor(provider: Provider, err: unknown): string {
  // Firebase web SDK throws errors with a `code` property (auth/...).
  // We pluck it carefully without dragging in the Firebase types here.
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : null;

  if (err instanceof FirebaseNotConfiguredError) {
    return `${labelOf(provider)} sign-in isn't set up yet. Check back soon.`;
  }
  if (code === "auth/operation-not-allowed") {
    return `${labelOf(provider)} sign-in isn't enabled yet. Check back soon.`;
  }
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return ""; // user dismissed — not an error worth showing
  }
  if (code === "auth/popup-blocked") {
    return "Your browser blocked the sign-in popup. Allow popups and try again.";
  }
  if (err instanceof AuthApiError) return err.message;
  return err instanceof Error ? err.message : "Sign-in failed. Please try again.";
}

function labelOf(p: Provider): string {
  return p === "google" ? "Google" : "Apple";
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.86-3.08.41-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.41C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
