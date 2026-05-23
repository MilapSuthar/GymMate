"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Dumbbell, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface LastMessage {
  id: string;
  content: string;
  fromMe: boolean;
  createdAt: string;
}

interface MatchRow {
  id: string;
  createdAt: string;
  otherUser: {
    id: string;
    name: string;
    photoUrl: string | null;
  };
  lastMessage: LastMessage | null;
  lastActivityAt: string;
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export default function MatchesPage() {
  const { authFetch, loading: authLoading, user } = useAuth();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/matches");
      if (!res.ok) throw new Error("Failed to load matches");
      const data = await res.json();
      setMatches(data.matches ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (authLoading || !user) return;
    // Canonical fetch-on-mount; the React 19 rule flags the indirect setState
    // inside fetchMatches. Intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMatches();
  }, [authLoading, user, fetchMatches]);

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-1">Matches</h1>
      <p className="text-muted-foreground text-sm mb-5">
        People you and they both liked
      </p>

      {loading || authLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl h-[72px] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <button
            onClick={fetchMatches}
            className="text-sm font-medium text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageCircle size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm mb-1">No matches yet.</p>
          <p className="text-xs">
            Head to the deck and start swiping — your matches show up here.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 text-sm font-medium text-primary hover:underline"
          >
            Go to the deck
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/matches/${m.id}`}
              data-testid="match-row"
              className="flex items-center gap-3 rounded-xl p-3 border border-border bg-card hover:border-primary/40 transition-colors"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                {m.otherUser.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.otherUser.photoUrl}
                    alt={m.otherUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Dumbbell size={20} className="text-muted-foreground" />
                )}
              </div>

              {/* Name + preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm truncate">
                    {m.otherUser.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {timeAgo(m.lastActivityAt)}
                  </span>
                </div>
                {m.lastMessage ? (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {m.lastMessage.fromMe && "You: "}
                    {m.lastMessage.content}
                  </p>
                ) : (
                  <p className="text-xs text-primary mt-0.5">
                    New match — say hi
                  </p>
                )}
              </div>

              <ChevronRight
                size={16}
                className="text-muted-foreground shrink-0"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
