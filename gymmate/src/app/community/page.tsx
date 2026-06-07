"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Calendar,
  MapPin,
  Plus,
  Sparkles,
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
        {/* The Post button is a placeholder until M6 ships the create form.
            Disabled visual so users discover the feature exists, but can't
            click into a half-built flow. */}
        <button
          disabled
          aria-disabled
          title="Coming next milestone"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold opacity-50 cursor-not-allowed shrink-0"
        >
          <Plus size={16} />
          Post
        </button>
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
              <MeetupCard key={m.id} m={m} />
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
      <p className="text-sm text-muted-foreground max-w-xs">
        Be the first to post a meetup — the Post button goes live in the next
        milestone.
      </p>
    </div>
  );
}

function MeetupCard({ m }: { m: Meetup }) {
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
            {m.hasRsvped && !m.isMine ? " · you're going" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
