"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Check, Flame, Loader2, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SessionMeetup {
  id: string;
  title: string;
  sportTag: string;
  location: string;
  scheduledAt: string;
  isMine: boolean;
  checkedIn: boolean;
  rsvpCount: number;
  capacity: number | null;
}

interface WeeklyStats {
  weekSessions: number;
  weekCoAttendees: number;
}

/**
 * The V1 "I trained with people this week" surface on Profile.
 *
 * Lists the user's recent and upcoming meetups (host or attending), and
 * surfaces the weekly co-attendance stat — the single metric that makes
 * GymMate a fitness app and not a swipe app. Past sessions get a "Check in"
 * button until the user marks they actually showed up; once they do, the
 * weekly stat refreshes.
 */
export default function ProfileSessions() {
  const { user, authFetch, loading: authLoading } = useAuth();
  const [upcoming, setUpcoming] = useState<SessionMeetup[]>([]);
  const [recent, setRecent] = useState<SessionMeetup[]>([]);
  const [stats, setStats] = useState<WeeklyStats>({
    weekSessions: 0,
    weekCoAttendees: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/meetups/mine");
      if (!res.ok) return;
      const data = await res.json();
      setUpcoming(data.upcoming ?? []);
      setRecent(data.recent ?? []);
      setStats(
        data.weeklyStats ?? { weekSessions: 0, weekCoAttendees: 0 }
      );
    } catch {
      // best-effort — sessions are a nice-to-have surface, not a hard fail
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [authLoading, user, load]);

  const checkIn = useCallback(
    async (id: string) => {
      if (pendingId) return;
      setPendingId(id);
      // Optimistically flip so the UI feels instant.
      setRecent((prev) =>
        prev.map((m) => (m.id === id ? { ...m, checkedIn: true } : m))
      );
      try {
        const res = await authFetch(`/api/meetups/${id}/checkin`, {
          method: "POST",
        });
        if (!res.ok) {
          // Roll back.
          setRecent((prev) =>
            prev.map((m) => (m.id === id ? { ...m, checkedIn: false } : m))
          );
          const data = await res.json().catch(() => null);
          const { toast } = await import("sonner");
          toast.error(data?.error || "Couldn't check in");
          return;
        }
        // The stat changed — refetch to pick up the new weekCoAttendees.
        load();
      } catch {
        setRecent((prev) =>
          prev.map((m) => (m.id === id ? { ...m, checkedIn: false } : m))
        );
      } finally {
        setPendingId(null);
      }
    },
    [authFetch, load, pendingId]
  );

  if (loading || authLoading) {
    return (
      <section className="mt-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Sessions
        </h3>
        <div className="h-16 rounded-xl bg-secondary/60 animate-pulse" />
      </section>
    );
  }

  const noActivity =
    upcoming.length === 0 && recent.length === 0 && stats.weekSessions === 0;

  if (noActivity) {
    return (
      <section className="mt-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Sessions
        </h3>
        <p className="text-sm text-muted-foreground">
          No meetups yet.{" "}
          <Link href="/community" className="text-primary underline">
            Find a session
          </Link>{" "}
          to join.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Sessions
      </h3>

      {stats.weekSessions > 0 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 mb-3 flex items-start gap-2.5">
          <Flame
            size={18}
            className="text-amber-400 mt-0.5 shrink-0"
            fill="currentColor"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-300">
              You worked out with {stats.weekCoAttendees}{" "}
              {stats.weekCoAttendees === 1 ? "person" : "people"} this week
            </p>
            <p className="text-xs text-muted-foreground">
              Across {stats.weekSessions}{" "}
              {stats.weekSessions === 1 ? "session" : "sessions"}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {recent.map((m) => (
          <SessionRow
            key={m.id}
            m={m}
            isPast
            pending={pendingId === m.id}
            onCheckIn={() => checkIn(m.id)}
          />
        ))}
        {upcoming.map((m) => (
          <SessionRow
            key={m.id}
            m={m}
            isPast={false}
            pending={false}
            onCheckIn={() => {}}
          />
        ))}
      </div>
    </section>
  );
}

function SessionRow({
  m,
  isPast,
  pending,
  onCheckIn,
}: {
  m: SessionMeetup;
  isPast: boolean;
  pending: boolean;
  onCheckIn: () => void;
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
  return (
    <div
      data-testid="session-row"
      className="rounded-xl border border-border bg-card p-3 flex items-start gap-3"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Calendar size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          {m.title}
          {m.isMine ? (
            <span className="text-muted-foreground font-normal"> · hosting</span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {dateStr} · {timeStr}
        </p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPin size={10} />
          <span className="truncate">{m.location}</span>
        </p>
      </div>
      {isPast && m.checkedIn ? (
        <span className="shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
          <Check size={11} />
          Checked in
        </span>
      ) : isPast ? (
        <button
          onClick={onCheckIn}
          disabled={pending}
          data-testid={`checkin-${m.id}`}
          className="shrink-0 inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            "Check in"
          )}
        </button>
      ) : (
        <span className="shrink-0 text-[11px] font-semibold text-muted-foreground self-center">
          Upcoming
        </span>
      )}
    </div>
  );
}
