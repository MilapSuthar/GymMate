"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { requestFcmToken, notificationsSupported } from "@/lib/fcm-client";

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell() {
  const { user, authFetch, loading: authLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const tokenAskedRef = useRef(false);

  const fetchCount = useCallback(async () => {
    try {
      const res = await authFetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silent — bell stays at last known count
    }
  }, [authFetch]);

  // Poll for unread count while authenticated
  useEffect(() => {
    if (authLoading || !user) return;
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [authLoading, user, fetchCount]);

  // Request notification permission + register FCM token on first login.
  // Runs once per session; if the user denies we don't keep nagging.
  useEffect(() => {
    if (authLoading || !user || tokenAskedRef.current) return;
    if (!notificationsSupported()) return;
    tokenAskedRef.current = true;

    (async () => {
      const token = await requestFcmToken();
      if (!token) return;
      try {
        await authFetch("/api/notifications/token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
      } catch {
        // Silent — push delivery is best-effort
      }
    })();
  }, [authLoading, user, authFetch]);

  if (!user) return null;

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-secondary transition-colors"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span
          data-testid="notification-badge"
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
