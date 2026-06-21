"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Dumbbell,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    experienceLevel: string | null;
    gymName: string | null;
  };
  distanceKm: number | null;
  overlap: number;
  sameGym: boolean;
  whyMatched: string;
  lastMessage: LastMessage | null;
  unreadCount: number;
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
        People you and they both liked — start with the strongest fit
      </p>

      {loading || authLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl h-[108px] animate-pulse"
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
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 flex flex-col items-center justify-center text-center px-6 py-14">
          <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-3">
            <MessageCircle size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-1">No matches yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            Head to the deck and like a few lifters. When you both like each
            other, they show up here with shared schedules and goals already
            surfaced.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >
            Go to the deck
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {matches.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({ m }: { m: MatchRow }) {
  const { otherUser, distanceKm, overlap, sameGym, whyMatched, lastMessage } =
    m;
  const hasMeta =
    distanceKm != null || overlap > 0 || sameGym || !!otherUser.gymName;

  return (
    <Link
      href={`/matches/${m.id}`}
      data-testid="match-row"
      className="flex items-start gap-3 rounded-xl p-3 border border-border bg-card hover:border-primary/40 transition-colors"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
        {otherUser.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={otherUser.photoUrl}
            alt={otherUser.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Dumbbell size={20} className="text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Top row: name + experience pill + timestamp */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm truncate">
              {otherUser.name}
            </span>
            {otherUser.experienceLevel && (
              <Badge
                variant="secondary"
                className="capitalize text-[10px] py-0 px-1.5 shrink-0"
              >
                {otherUser.experienceLevel}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {timeAgo(m.lastActivityAt)}
          </span>
        </div>

        {/* Context row: distance · overlap · gym */}
        {hasMeta && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
            {distanceKm != null && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin size={10} />
                {distanceKm} km
              </span>
            )}
            {overlap > 0 && (
              <>
                {distanceKm != null && (
                  <span className="opacity-50">·</span>
                )}
                <span className="inline-flex items-center gap-0.5">
                  <Clock size={10} />
                  {overlap}× overlap
                </span>
              </>
            )}
            {sameGym && otherUser.gymName && (
              <>
                <span className="opacity-50">·</span>
                <span className="truncate">{otherUser.gymName}</span>
              </>
            )}
            {!sameGym && otherUser.gymName && (
              <>
                <span className="opacity-50">·</span>
                <span className="truncate">{otherUser.gymName}</span>
              </>
            )}
          </div>
        )}

        {/* Why-matched — the explanatory headline that makes the list feel
            curated rather than random. */}
        <p className="inline-flex items-center gap-1 text-[11px] text-emerald-300 mt-1 max-w-full">
          <Sparkles size={10} className="shrink-0" />
          <span className="truncate">{whyMatched}</span>
        </p>

        {/* Last message preview (secondary). For brand-new matches we keep
            the call-to-action loud since there's no message yet. */}
        {lastMessage ? (
          <p className="text-xs text-muted-foreground truncate mt-1.5">
            {lastMessage.fromMe && (
              <span className="font-medium">You: </span>
            )}
            {lastMessage.content}
          </p>
        ) : (
          <p className="text-xs text-primary mt-1.5 font-medium">
            New match — say hi
          </p>
        )}
      </div>

      {/* Unread badge — sits centered next to the row so the card stays
          single-glance scannable. */}
      {m.unreadCount > 0 && (
        <span
          data-testid="unread-badge"
          className="rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 h-5 min-w-[20px] flex items-center justify-center shrink-0 self-center"
        >
          {m.unreadCount > 99 ? "99+" : m.unreadCount}
        </span>
      )}
    </Link>
  );
}
