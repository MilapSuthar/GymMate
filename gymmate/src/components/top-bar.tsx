"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/notification-bell";
import { useAuth } from "@/context/AuthContext";

const HIDE_ON = ["/login", "/register"];

export default function TopBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (HIDE_ON.includes(pathname) || !user) return null;

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-4 h-12">
        <Link href="/" className="font-bold text-base tracking-tight">
          GymMate
        </Link>
        <NotificationBell />
      </div>
    </header>
  );
}
