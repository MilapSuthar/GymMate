"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, HelpCircle, Users, Apple, Dumbbell } from "lucide-react";

const tabs = [
  { href: "/", label: "Match", icon: Heart },
  { href: "/help-board", label: "Help Board", icon: HelpCircle },
  { href: "/trainers", label: "Trainers", icon: Users },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/exercise", label: "Exercise", icon: Dumbbell },
];

export default function BottomNav() {
  const pathname = usePathname();

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
      </div>
    </nav>
  );
}
