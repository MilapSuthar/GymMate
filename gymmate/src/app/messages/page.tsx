"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface MatchSummary {
  id: string;
  otherUser: { id: string; name: string; photoUrl: string | null };
  lastMessage: {
    id: string;
    content: string;
    fromMe: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export default function MessagesListPage() {
  const { user, authFetch, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/matches");
      if (!res.ok) throw new Error("Failed to load matches");
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, user, load]);

  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-4 gap-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Messages</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Chat with your matches
        </p>

        {loading ? (
          <SkeletonList />
        ) : error ? (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : matches.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-1" data-testid="matches-list">
            {matches.map((m) => (
              <li key={m.id}>
                <MatchRow match={m} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MatchRow({ match }: { match: MatchSummary }) {
  const initial = match.otherUser.name.trim().charAt(0).toUpperCase() || "?";
  const preview = match.lastMessage
    ? `${match.lastMessage.fromMe ? "You: " : ""}${match.lastMessage.content}`
    : "Say hi 👋";
  const time = match.lastMessage
    ? formatTime(new Date(match.lastMessage.createdAt))
    : "New";
  const unread = match.unreadCount > 0 && !match.lastMessage?.fromMe;

  return (
    <Link
      href={`/messages/${match.id}`}
      data-testid={`match-row-${match.id}`}
      className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-secondary transition-colors"
    >
      <div className="relative shrink-0">
        {match.otherUser.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match.otherUser.photoUrl}
            alt={match.otherUser.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-base font-semibold text-foreground">
            {initial}
          </div>
        )}
        {unread && (
          <span
            data-testid="unread-dot"
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate text-sm ${unread ? "font-bold" : "font-semibold"}`}>
            {match.otherUser.name}
          </p>
          <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>
        </div>
        <p
          className={`truncate text-xs ${
            unread ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {preview}
        </p>
      </div>
      {match.unreadCount > 0 && !match.lastMessage?.fromMe && (
        <span
          data-testid="unread-badge"
          className="ml-1 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1.5"
        >
          {match.unreadCount > 99 ? "99+" : match.unreadCount}
        </span>
      )}
    </Link>
  );
}

function formatTime(d: Date): string {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-3 px-2">
          <div className="w-12 h-12 rounded-full bg-secondary animate-pulse" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 w-1/3 bg-secondary rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-secondary rounded animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-8 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-3">
        <MessageCircle size={26} />
      </div>
      <h3 className="text-base font-semibold mb-1">No conversations yet</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Match with someone on the Match tab and start chatting.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline"
      >
        <Sparkles size={14} /> Find matches
      </Link>
    </div>
  );
}
