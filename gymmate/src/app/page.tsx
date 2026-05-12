"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Heart, MapPin, Dumbbell, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import ProfileCompletionBanner from "@/components/profile-completion-banner";
import { useAuth } from "@/context/AuthContext";
import { DISTANCE_OPTIONS } from "@/lib/geo";

interface DiscoverUser {
  id: string;
  name: string;
  age: number | null;
  bio: string | null;
  gymName: string | null;
  fitnessGoals: string[];
  experienceLevel: string | null;
  photoUrl: string | null;
  distance: number | null;
}

interface MatchedUser {
  id: string;
  name: string;
  photoUrl: string | null;
}

const GRADIENTS = [
  "from-violet-900 to-indigo-900",
  "from-rose-900 to-pink-900",
  "from-emerald-900 to-teal-900",
  "from-amber-900 to-orange-900",
  "from-sky-900 to-blue-900",
  "from-fuchsia-900 to-purple-900",
];

function gradientFor(id: string): string {
  // Stable per-user gradient so a card doesn't flicker colors on re-render
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

export default function MatchPage() {
  const { user, authFetch, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [matchedWith, setMatchedWith] = useState<MatchedUser | null>(null);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const locationAskedRef = useRef(false);

  const fetchDiscover = useCallback(
    async (km: number | null) => {
      setLoading(true);
      setError(null);
      try {
        const qs = km != null ? `?maxDistance=${km}` : "";
        const res = await authFetch(`/api/discover${qs}`);
        if (!res.ok) throw new Error("Failed to load matches");
        const data = await res.json();
        setUsers(data.users || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  // Ask for browser location once after auth resolves; save coords if granted.
  useEffect(() => {
    if (authLoading || !user || locationAskedRef.current) return;
    locationAskedRef.current = true;

    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await authFetch("/api/profile/location", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          // Refetch so distances populate on the visible cards
          fetchDiscover(maxDistance);
        } catch {
          // Silent — discover still works without coords
        }
      },
      () => {
        // Permission denied or unavailable — graceful no-op
      },
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, [authLoading, user, authFetch, fetchDiscover, maxDistance]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchDiscover(maxDistance);
  }, [authLoading, user, fetchDiscover, maxDistance]);

  const swipe = useCallback(
    async (target: DiscoverUser, direction: "like" | "pass") => {
      if (pendingId) return; // debounce double-clicks while a swipe is in flight
      setPendingId(target.id);
      // Optimistically remove the card so the next one is in front immediately
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      try {
        const res = await authFetch("/api/swipe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ swipeeId: target.id, direction }),
        });
        if (!res.ok) {
          // put the card back if the server rejected it — the user shouldn't
          // silently lose someone they wanted to like
          setUsers((prev) => [target, ...prev]);
          return;
        }
        const data = await res.json();
        if (data.isMatch && data.match?.otherUser) {
          setMatchedWith(data.match.otherUser);
        }
      } catch {
        setUsers((prev) => [target, ...prev]);
      } finally {
        setPendingId(null);
      }
    },
    [authFetch, pendingId]
  );

  const top = users[0];

  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-4 gap-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Match</h1>
        <p className="text-muted-foreground text-sm mb-4">Gym-goers near you</p>

        <ProfileCompletionBanner />

        {/* Distance filter chip row */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          <button
            onClick={() => setMaxDistance(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              maxDistance === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Any
          </button>
          {DISTANCE_OPTIONS.map((km) => (
            <button
              key={km}
              onClick={() => setMaxDistance(km)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                maxDistance === km
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {km} km
            </button>
          ))}
        </div>

        {/* Card area — single card swap rather than a stack to keep it cheap */}
        <div className="relative w-full" data-testid="match-card-area">
          {loading || authLoading ? (
            <SkeletonCard />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchDiscover(maxDistance)} />
          ) : !top ? (
            <EmptyState onRefresh={() => fetchDiscover(maxDistance)} />
          ) : (
            <ProfileCard user={top} disabled={!!pendingId} onSwipe={swipe} />
          )}
        </div>
      </div>

      {/* Match modal */}
      <Dialog
        open={!!matchedWith}
        onOpenChange={(open) => !open && setMatchedWith(null)}
      >
        <DialogContent
          className="sm:max-w-sm text-center"
          data-testid="match-modal"
        >
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles size={28} />
            </div>
            <DialogTitle className="text-2xl text-center">
              It&apos;s a Match!
            </DialogTitle>
            <DialogDescription className="text-center">
              You and {matchedWith?.name} liked each other. Say hi!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Link
              href="/matches"
              className={buttonVariants({ variant: "default", className: "w-full" })}
            >
              View matches
            </Link>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setMatchedWith(null)}
            >
              Keep swiping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileCard({
  user,
  disabled,
  onSwipe,
}: {
  user: DiscoverUser;
  disabled: boolean;
  onSwipe: (u: DiscoverUser, dir: "like" | "pass") => void;
}) {
  return (
    <div data-testid="match-card" data-user-id={user.id}>
      <div
        className={`relative w-full rounded-3xl overflow-hidden bg-gradient-to-b ${gradientFor(
          user.id
        )} aspect-[3/4]`}
      >
        {user.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoUrl}
            alt={user.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
              <Dumbbell size={48} className="text-white/40" />
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
          <h2 className="text-xl font-bold text-white">
            {user.name}
            {user.age ? `, ${user.age}` : ""}
          </h2>
          {(user.gymName || user.distance != null) && (
            <div className="flex items-center gap-1 text-white/70 text-sm mt-0.5">
              <MapPin size={13} />
              <span>
                {user.gymName ?? "Gym not set"}
                {user.distance != null ? ` · ${user.distance.toFixed(1)} km` : ""}
              </span>
            </div>
          )}
          {user.fitnessGoals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {user.fitnessGoals.map((tag) => (
                <Badge
                  key={tag}
                  className="bg-white/15 text-white border-0 text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-8 mt-5">
        <button
          aria-label="Pass"
          data-testid="swipe-pass"
          disabled={disabled}
          onClick={() => onSwipe(user, "pass")}
          className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-destructive/20 hover:border-destructive transition-colors disabled:opacity-50"
        >
          <X size={26} className="text-muted-foreground" />
        </button>
        <button
          aria-label="Like"
          data-testid="swipe-like"
          disabled={disabled}
          onClick={() => onSwipe(user, "like")}
          className="w-16 h-16 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg shadow-primary/30 disabled:opacity-50"
        >
          <Heart
            size={26}
            className="text-primary-foreground"
            fill="currentColor"
          />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div
      data-testid="match-empty"
      className="rounded-3xl border border-dashed border-border bg-secondary/40 aspect-[3/4] flex flex-col items-center justify-center text-center px-6"
    >
      <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-4">
        <Sparkles size={28} />
      </div>
      <h3 className="text-lg font-semibold mb-1">All caught up</h3>
      <p className="text-sm text-muted-foreground mb-4">
        You&apos;ve seen everyone nearby. Check back soon for new gym-goers.
      </p>
      <Button variant="secondary" onClick={onRefresh}>
        Refresh
      </Button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl bg-secondary/60 aspect-[3/4] animate-pulse" />
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-3xl border border-destructive/40 bg-destructive/10 aspect-[3/4] flex flex-col items-center justify-center text-center px-6">
      <p className="text-sm text-destructive mb-4">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
