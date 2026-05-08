"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, HelpCircle, Users, Apple, Dumbbell, User, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const tabs = [
  { href: "/", label: "Match", icon: Heart },
  { href: "/help-board", label: "Help", icon: HelpCircle },
  { href: "/trainers", label: "Trainers", icon: Users },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/exercise", label: "Exercise", icon: Dumbbell },
  { href: "/profile", label: "Profile", icon: User },
];

const HIDDEN_ON = ["/login", "/register"];

export default function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Hide on auth routes — gives the login/register screens a clean canvas
  if (HIDDEN_ON.includes(pathname)) return null;
  // Don't render until we know the user — avoids flicker before silent refresh resolves
  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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
        <button
          onClick={() => logout()}
          aria-label="Log out"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut size={20} strokeWidth={1.8} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
