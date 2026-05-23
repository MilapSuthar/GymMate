"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Flame } from "lucide-react";
import NotificationBell from "@/components/notification-bell";
import { useAuth } from "@/context/AuthContext";

const HIDE_ON = ["/login", "/register", "/onboarding"];

export default function TopBar() {
  const pathname = usePathname();
  const { user, authFetch } = useAuth();
  const [streak, setStreak] = useState(0);

  // Check in once per app load: this records today's activity server-side and
  // returns the consecutive-day streak. Idempotent within a UTC day, so it's
  // safe even though the top bar can mount more than once. Best-effort — the
  // flame just stays hidden if it fails.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authFetch("/api/streak/checkin", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStreak(data.streakCount ?? 0);
      })
      .catch(() => {
        // Silent — streak is a gamification nicety, not a critical path.
      });
    return () => {
      cancelled = true;
    };
  }, [user, authFetch]);

  if (HIDE_ON.includes(pathname) || !user) return null;

  const onMatches = pathname === "/matches" || pathname.startsWith("/matches/");

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-4 h-12">
        <Link href="/" className="font-bold text-base tracking-tight">
          GymMate
        </Link>
        <div className="flex items-center gap-1">
          {/* Daily-streak flame — only shown once a streak exists, so it always
              reads as a reward rather than a zeroed-out placeholder. */}
          {streak > 0 && (
            <div
              title={`${streak}-day streak — keep it going!`}
              aria-label={`${streak} day streak`}
              className="flex items-center gap-1 px-2 h-8 mr-1 rounded-full bg-amber-500/15 text-amber-400 text-sm font-bold"
            >
              <Flame size={16} fill="currentColor" />
              {streak}
            </div>
          )}
          {/* Persistent entry point to conversations — without this the only
              way into /matches is the one-time match modal or a notification. */}
          <Link
            href="/matches"
            aria-label="Messages"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-secondary ${
              onMatches ? "text-primary" : "text-foreground"
            }`}
          >
            <MessageCircle size={20} />
          </Link>
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
