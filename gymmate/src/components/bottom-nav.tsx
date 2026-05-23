"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageCircle, HelpCircle, Users, Apple, Dumbbell, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const tabs = [
  { href: "/", label: "Match", icon: Heart },
  { href: "/messages", label: "Chats", icon: MessageCircle, badgeKey: "unread" as const },
  { href: "/help-board", label: "Help", icon: HelpCircle },
  { href: "/trainers", label: "Trainers", icon: Users },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/exercise", label: "Exercise", icon: Dumbbell },
  { href: "/profile", label: "Profile", icon: User },
];

const HIDDEN_ON = ["/login", "/register", "/onboarding"];

const POLL_MS = 30_000;

export default function BottomNav() {
  const pathname = usePathname();
  const { user, authFetch } = useAuth();
  const [unread, setUnread] = useState(0);

  // Hide on auth routes — gives the login/register screens a clean canvas
  const hidden = HIDDEN_ON.includes(pathname);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch("/api/messages/unread");
      if (!res.ok) return;
      const data = await res.json();
      setUnread(typeof data.unread === "number" ? data.unread : 0);
    } catch {
      // network blip — keep the previous count
    }
  }, [authFetch, user]);

  // Poll every 30s. Cheap because the count query is a single COUNT(*).
  // When we add a global SSE/notifications stream later, this can be
  // replaced with an event-driven update.
  useEffect(() => {
    if (!user) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, POLL_MS);
    return () => clearInterval(interval);
  }, [user, fetchUnread]);

  // Drop the badge to 0 the moment the user lands on /messages or a chat,
  // so it doesn't lag behind the read-marking POST.
  useEffect(() => {
    if (pathname.startsWith("/messages")) setUnread(0);
  }, [pathname]);

  if (hidden) return null;
  // Don't render until we know the user — avoids flicker before silent refresh resolves
  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex">
        {tabs.map(({ href, label, icon: Icon, badgeKey }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const badge = badgeKey === "unread" ? unread : 0;
          return (
            <Link
              key={href}
              href={href}
              data-testid={`nav-${label.toLowerCase()}`}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {badge > 0 && (
                  <span
                    data-testid="nav-unread-badge"
                    className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1 border-2 border-card"
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
