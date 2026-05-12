"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Heart, MessageCircle, HelpCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "new_match" | "new_message" | "new_answer" | string;
  title: string;
  body: string;
  data: Record<string, string> | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  new_match: Heart,
  new_message: MessageCircle,
  new_answer: HelpCircle,
};

const TYPE_COLOR: Record<string, string> = {
  new_match: "text-rose-500 bg-rose-500/10",
  new_message: "text-sky-500 bg-sky-500/10",
  new_answer: "text-amber-500 bg-amber-500/10",
};

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function hrefFor(n: Notification): string {
  if (n.type === "new_match") return "/matches";
  if (n.type === "new_message" && n.data?.matchId) return `/matches`;
  if (n.type === "new_answer" && n.data?.questionId)
    return `/help-board/${n.data.questionId}`;
  return "/notifications";
}

export default function NotificationsPage() {
  const { authFetch, loading: authLoading, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/notifications");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();
  }, [authLoading, user, fetchData]);

  const markAllRead = async () => {
    try {
      const res = await authFetch("/api/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" className="gap-1" onClick={markAllRead}>
            <Check size={13} />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-4 h-[72px] animate-pulse"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            const color = TYPE_COLOR[n.type] ?? "text-primary bg-primary/10";
            return (
              <Link
                key={n.id}
                href={hrefFor(n)}
                className={`flex items-start gap-3 rounded-xl p-3 border transition-colors ${
                  n.read
                    ? "bg-card border-border"
                    : "bg-primary/5 border-primary/20"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {n.body}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
