"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  MapPin,
  Plus,
  Sparkles,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

interface Host {
  id: string;
  name: string;
  photoUrl: string | null;
}

interface Meetup {
  id: string;
  title: string;
  description: string | null;
  sportTag: string;
  location: string;
  scheduledAt: string;
  durationMins: number;
  capacity: number | null;
  rsvpCount: number;
  isMine: boolean;
  hasRsvped: boolean;
  host: Host;
}

export default function CommunityPage() {
  const { user, authFetch, loading: authLoading } = useAuth();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/meetups");
      if (!res.ok) throw new Error("Failed to load meetups");
      const data = await res.json();
      setMeetups(data.meetups ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // Canonical fetch-on-mount; the React 19 rule flags the indirect setState
  // inside load(). Intentional.
  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [authLoading, user, load]);

  const isLoading = loading && !!user;

  /**
   * Toggle the viewer's RSVP. Optimistic — we flip the card immediately and
   * roll back on a non-2xx response. Host cards are never passed through here
   * (no Going button rendered for them).
   */
  const toggleRsvp = useCallback(
    async (m: Meetup, going: boolean) => {
      if (pendingId || m.isMine) return;
      setPendingId(m.id);
      // Optimistically flip the card.
      setMeetups((prev) =>
        prev.map((x) =>
          x.id === m.id
            ? {
                ...x,
                hasRsvped: going,
                rsvpCount: x.rsvpCount + (going ? 1 : -1),
              }
            : x
        )
      );
      try {
        const res = await authFetch(`/api/meetups/${m.id}/rsvp`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ going }),
        });
        if (!res.ok) {
          // Roll back.
          setMeetups((prev) =>
            prev.map((x) =>
              x.id === m.id
                ? {
                    ...x,
                    hasRsvped: !going,
                    rsvpCount: x.rsvpCount + (going ? -1 : 1),
                  }
                : x
            )
          );
          const data = await res.json().catch(() => null);
          const { toast } = await import("sonner");
          toast.error(data?.error || "Couldn't update your RSVP");
        }
      } catch {
        setMeetups((prev) =>
          prev.map((x) =>
            x.id === m.id
              ? {
                  ...x,
                  hasRsvped: !going,
                  rsvpCount: x.rsvpCount + (going ? -1 : 1),
                }
              : x
          )
        );
      } finally {
        setPendingId(null);
      }
    },
    [authFetch, pendingId]
  );

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold">Community</h1>
          <p className="text-muted-foreground text-sm">
            Join a session, or post one of your own
          </p>
        </div>
        <Link
          href="/community/new"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0 hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
        >
          <Plus size={16} />
          Post
        </Link>
      </div>

      <div className="mt-5">
        {isLoading || authLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-secondary/60 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 flex flex-col items-center justify-center text-center px-6 py-12">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button variant="secondary" onClick={load}>
              Try again
            </Button>
          </div>
        ) : meetups.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {meetups.map((m) => (
              <MeetupCard
                key={m.id}
                m={m}
                pending={pendingId === m.id}
                onRsvp={toggleRsvp}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/40 flex flex-col items-center justify-center text-center px-6 py-14">
      <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-3">
        <Sparkles size={24} />
      </div>
      <h3 className="text-lg font-semibold mb-1">No upcoming sessions yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-4">
        Be the first to post one. Hit Post above and pick a time and place.
      </p>
      <Link
        href="/community/new"
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
      >
        <Plus size={14} />
        Post a meetup
      </Link>
    </div>
  );
}

function MeetupCard({
  m,
  pending,
  onRsvp,
}: {
  m: Meetup;
  pending: boolean;
  onRsvp: (m: Meetup, going: boolean) => void;
}) {
  const sched = new Date(m.scheduledAt);
  const dateStr = sched.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = sched.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const capacityLabel = m.capacity
    ? `${m.rsvpCount}/${m.capacity} going`
    : `${m.rsvpCount} going`;
  const isFull =
    m.capacity != null && m.rsvpCount >= m.capacity && !m.hasRsvped;

  return (
    <div
      data-testid="meetup-card"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Users size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold truncate">{m.title}</h3>
            <Badge
              variant="secondary"
              className="capitalize text-[10px] py-0 shrink-0"
            >
              {m.sportTag}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar size={12} />
            <span>
              {dateStr} · {timeStr}
            </span>
            <span className="opacity-60">·</span>
            <span>{capacityLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <MapPin size={12} />
            <span className="truncate">{m.location}</span>
          </div>
          {m.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {m.description}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">
            Hosted by {m.host.name}
            {m.isMine ? " (you)" : ""}
          </p>
        </div>

        {/* RSVP action — host doesn't get one (their RSVP is implicit). */}
        {!m.isMine && (
          <button
            disabled={pending || (isFull && !m.hasRsvped)}
            onClick={() => onRsvp(m, !m.hasRsvped)}
            data-testid={`rsvp-${m.id}`}
            className={`shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
              m.hasRsvped
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {pending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : m.hasRsvped ? (
              <>
                <Check size={12} />
                Going
              </>
            ) : isFull ? (
              "Full"
            ) : (
              "Join"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
