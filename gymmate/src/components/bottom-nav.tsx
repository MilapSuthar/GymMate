"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Users, MessageCircle, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// V1 nav: Match (the wedge) → Community (meetups) → Messages → Profile.
// Trainers, Nutrition, Exercise, and the old Help board are hidden from the
// nav for V1 but their routes still exist — we'll resurrect them in V2 only
// once the buddy-finding loop has demand-validated.
const tabs = [
  { href: "/", label: "Match", icon: Heart },
  { href: "/community", label: "Community", icon: Users },
  { href: "/matches", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

const HIDDEN_ON = ["/login", "/register", "/onboarding"];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Hide on auth routes — gives the login/register screens a clean canvas
  if (HIDDEN_ON.includes(pathname)) return null;
  // Don't render until we know the user — avoids flicker before silent refresh resolves
  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
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
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
