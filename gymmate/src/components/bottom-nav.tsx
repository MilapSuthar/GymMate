"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageCircle, HelpCircle, Users, Apple, Dumbbell, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const tabs = [
  { href: "/", label: "Match", icon: Heart },
  { href: "/matches", label: "Chats", icon: MessageCircle },
  { href: "/help-board", label: "Help", icon: HelpCircle },
  { href: "/trainers", label: "Trainers", icon: Users },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/exercise", label: "Exercise", icon: Dumbbell },
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
