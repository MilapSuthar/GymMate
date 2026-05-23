"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Heart,
  MapPin,
  Dumbbell,
  Sparkles,
  Flag,
  Clock,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { isOnboarded } from "@/lib/profile";
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
  /** Ordered photo URLs (1..6). Empty array means "no photo set". */
  photos: string[];
  distance: number | null;
  /** Shared (day, slot) cells with the viewer. 0 = no overlap or no schedule. */
  overlap: number;
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
  const router = useRouter();
  const { user, authFetch, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [matchedWith, setMatchedWith] = useState<MatchedUser | null>(null);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  // Schedule-overlap filter. `null` = no constraint; any positive integer
  // means "only show people who share at least N slots with me".
  const [minOverlap, setMinOverlap] = useState<number | null>(null);
  const [reportTarget, setReportTarget] = useState<DiscoverUser | null>(null);
  // Count of people who liked the viewer but haven't been swiped back on —
  // powers the "Likes You" entry point at the top of the deck.
  const [likeCount, setLikeCount] = useState(0);
  // The most recent swipe, kept so the user can rewind it. Cleared after a
  // successful undo — only the latest swipe is undoable, matching the server.
  const [lastSwiped, setLastSwiped] = useState<DiscoverUser | null>(null);
  const [rewinding, setRewinding] = useState(false);
  const locationAskedRef = useRef(false);
  // Has this session already bounced through onboarding? We use sessionStorage
  // so the user can hit "Skip for now" and not get trapped in a redirect loop,
  // but a fresh session re-checks (catches the case where they finished
  // onboarding in another tab).
  const onboardingCheckedRef = useRef(false);

  const fetchDiscover = useCallback(
    async (km: number | null, overlap: number | null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (km != null) params.set("maxDistance", String(km));
        if (overlap != null) params.set("minOverlap", String(overlap));
        const qs = params.toString();
        const res = await authFetch(`/api/discover${qs ? `?${qs}` : ""}`);
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

  // Onboarding gate. Runs once per session: when the deck loads, we fetch the
  // current profile and bounce to /onboarding if the user hasn't filled out the
  // bare minimum (photo + gender + showMe + 3 schedule slots). Users can hit
  // "Skip for now" inside onboarding — we mark the check done in sessionStorage
  // so they're not redirected again in the same session.
  useEffect(() => {
    if (authLoading || !user || onboardingCheckedRef.current) return;
    onboardingCheckedRef.current = true;

    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("gymmate_onboarding_skipped") === "1") return;
    }

    (async () => {
      try {
        const res = await authFetch("/api/profile");
        if (!res.ok) return;
        const data = await res.json();
        if (!isOnboarded(data.profile)) {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("gymmate_onboarding_skipped", "1");
          }
          router.replace("/onboarding");
        }
      } catch {
        // Best-effort — don't block the deck on a profile fetch failure.
      }
    })();
  }, [authLoading, user, authFetch, router]);

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
          fetchDiscover(maxDistance, minOverlap);
        } catch {
          // Silent — discover still works without coords
        }
      },
      () => {
        // Permission denied or unavailable — graceful no-op
      },
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, [authLoading, user, authFetch, fetchDiscover, maxDistance, minOverlap]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return; // nothing to fetch; isLoading below resolves to false
    // The React 19 lint rule flags any setState call reachable from an effect
    // body, including indirect ones (fetchDiscover internally calls setLoading
    // before its network round-trip). This is the canonical "fetch on prop
    // change" pattern, so the disable is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDiscover(maxDistance, minOverlap);
  }, [authLoading, user, fetchDiscover, maxDistance, minOverlap]);

  // Fetch the "likes you" count so the deck can surface the inbox entry.
  // Best-effort: the entry simply stays hidden if this fails. setState happens
  // in an async callback, so it doesn't trip the set-state-in-effect rule.
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    authFetch("/api/likes")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setLikeCount(data.count ?? 0);
      })
      .catch(() => {
        // Silent — the "Likes You" pill just won't render.
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, authFetch]);

  // Derived loading: once auth has resolved and there's no logged-in user,
  // we're not actually loading anything — just idle. Computing this in render
  // (rather than calling setLoading(false) from an effect) keeps us aligned
  // with React 19's set-state-in-effect rule.
  const isLoading = loading && !!user;

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
        // Remember this swipe so it can be rewound.
        setLastSwiped(target);
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

  // Rewind the most recent swipe. The server deletes its latest swipe row (and
  // any match it formed, unless a chat has started); we slot the remembered
  // card back to the front of the deck.
  const rewind = useCallback(async () => {
    if (rewinding || !lastSwiped) return;
    setRewinding(true);
    try {
      const res = await authFetch("/api/swipe/undo", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const { toast } = await import("sonner");
        toast.error(data?.error || "Couldn't undo your last swipe");
        return;
      }
      const data = await res.json();
      // Slot the card back if it's the one we remembered; otherwise the deck
      // has moved on, so refetch to stay consistent with the server.
      if (data.undone?.swipeeId === lastSwiped.id) {
        setUsers((prev) => [
          lastSwiped,
          ...prev.filter((u) => u.id !== lastSwiped.id),
        ]);
      } else {
        fetchDiscover(maxDistance, minOverlap);
      }
      // The rewind may have dissolved a just-formed match — clear the modal.
      setMatchedWith(null);
      setLastSwiped(null);
    } catch {
      const { toast } = await import("sonner");
      toast.error("Couldn't undo your last swipe");
    } finally {
      setRewinding(false);
    }
  }, [authFetch, rewinding, lastSwiped, fetchDiscover, maxDistance, minOverlap]);

  const top = users[0];

  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-4 gap-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Match</h1>
          {/* Rewind — deck-level so it stays reachable even when the deck has
              emptied out. Only rendered once there's a swipe to undo. */}
          {lastSwiped && (
            <button
              onClick={rewind}
              disabled={rewinding}
              aria-label="Undo last swipe"
              data-testid="swipe-rewind"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={14} className={rewinding ? "animate-spin" : ""} />
              Undo
            </button>
          )}
        </div>
        <p className="text-muted-foreground text-sm mb-4">Gym-goers near you</p>

        {/* "Likes You" inbox entry — only shown when there's something to see,
            so it always lands as a reward rather than an empty placeholder. */}
        {likeCount > 0 && (
          <Link
            href="/likes"
            className="flex items-center justify-between gap-2 mb-4 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Heart size={16} fill="currentColor" />
              {likeCount} {likeCount === 1 ? "person likes" : "people like"} you
            </span>
            <ChevronRight size={18} className="text-primary" />
          </Link>
        )}

        <ProfileCompletionBanner />

        {/* Overlap filter chip row — the moat surface. "3+ overlap" is the
            recommended starting point (≈3× per week crossings). */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none">
          <button
            onClick={() => setMinOverlap(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              minOverlap === null
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <Clock size={11} />
            Any time
          </button>
          {[1, 3, 5].map((n) => (
            <button
              key={n}
              onClick={() => setMinOverlap(n)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                minOverlap === n
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <Clock size={11} />
              {n}+ overlap
            </button>
          ))}
        </div>

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
          {isLoading || authLoading ? (
            <SkeletonCard />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchDiscover(maxDistance, minOverlap)} />
          ) : !top ? (
            <EmptyState onRefresh={() => fetchDiscover(maxDistance, minOverlap)} />
          ) : (
            <ProfileCard
              user={top}
              disabled={!!pendingId}
              onSwipe={swipe}
              onReport={(u) => setReportTarget(u)}
            />
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

      <ReportDialog
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={async (reason) => {
          if (!reportTarget) return;
          try {
            const res = await authFetch(`/api/users/${reportTarget.id}/report`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ reason }),
            });
            if (!res.ok) throw new Error();
            // Reporting also blocks — remove the card and any future appearances
            setUsers((prev) => prev.filter((u) => u.id !== reportTarget.id));
            setReportTarget(null);
          } catch {
            // The dialog stays open so the user can retry; we surface this via a toast.
            const { toast } = await import("sonner");
            toast.error("Failed to send report — please try again");
          }
        }}
      />
    </div>
  );
}

const REPORT_REASONS = [
  "Inappropriate photos",
  "Harassment or hate speech",
  "Spam or fake profile",
  "Underage user",
  "Something else",
] as const;

function ReportDialog({
  target,
  onClose,
  onSubmit,
}: {
  target: DiscoverUser | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [submitting, setSubmitting] = useState(false);

  // Reset selection whenever the dialog is reopened for a new user — done
  // via the "derive from prop during render" pattern instead of useEffect.
  const [seenTargetId, setSeenTargetId] = useState<string | null>(target?.id ?? null);
  if (target && target.id !== seenTargetId) {
    setSeenTargetId(target.id);
    setReason(REPORT_REASONS[0]);
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Report {target?.name ?? "user"}</DialogTitle>
          <DialogDescription>
            Reports are reviewed by our team. The reported user will also be
            blocked and won&apos;t appear in your matches again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 my-3">
          {REPORT_REASONS.map((r) => (
            <label
              key={r}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                reason === r
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-primary"
              />
              <span className="text-sm">{r}</span>
            </label>
          ))}
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            variant="destructive"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onSubmit(reason);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Reporting…" : "Submit report"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Pixel drag distance after which we commit a swipe. */
const SWIPE_COMMIT_PX = 120;
/** Horizontal travel that gives the card a full 15° tilt. */
const ROTATION_DIVISOR = 12;

function ProfileCard({
  user,
  disabled,
  onSwipe,
  onReport,
}: {
  user: DiscoverUser;
  disabled: boolean;
  onSwipe: (u: DiscoverUser, dir: "like" | "pass") => void;
  onReport: (u: DiscoverUser) => void;
}) {
  // Photo carousel state. Tap left/right halves of the photo to cycle.
  // We reset to photo 0 whenever the underlying user changes using the
  // "store the prop you want to react to" pattern, which React docs recommend
  // over an effect (and the React 19 lint rule enforces).
  const photoCount = user.photos.length;
  const [photoIdx, setPhotoIdx] = useState(0);
  const [seenUserId, setSeenUserId] = useState(user.id);
  if (seenUserId !== user.id) {
    setSeenUserId(user.id);
    setPhotoIdx(0);
  }

  const currentPhoto = photoCount > 0 ? user.photos[photoIdx] : null;

  // Drag-to-swipe — uses pointer events so it works for both touch and mouse.
  // We commit a swipe when the user releases past the threshold, snap back
  // otherwise. While dragging, the card tilts proportionally to give feedback,
  // and the LIKE/NOPE stamp fades in.
  const [drag, setDrag] = useState({ dx: 0, dragging: false });
  const startXRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    startXRef.current = e.clientX;
    setDrag({ dx: 0, dragging: true });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.dragging) return;
    setDrag({ dx: e.clientX - startXRef.current, dragging: true });
  };
  const onPointerEnd = () => {
    if (!drag.dragging) return;
    const { dx } = drag;
    setDrag({ dx: 0, dragging: false });
    if (Math.abs(dx) >= SWIPE_COMMIT_PX) {
      onSwipe(user, dx > 0 ? "like" : "pass");
    }
  };

  const rotation = drag.dx / ROTATION_DIVISOR;
  // Opacity of the LIKE / NOPE stamp, 0 → 1 as you drag toward the threshold.
  const likeStamp = Math.min(Math.max(drag.dx / SWIPE_COMMIT_PX, 0), 1);
  const nopeStamp = Math.min(Math.max(-drag.dx / SWIPE_COMMIT_PX, 0), 1);

  return (
    <div data-testid="match-card" data-user-id={user.id}>
      <div
        className={`relative w-full rounded-3xl overflow-hidden bg-gradient-to-b ${gradientFor(
          user.id
        )} aspect-[3/4] select-none touch-pan-y ${
          drag.dragging ? "" : "transition-transform duration-200"
        }`}
        style={{
          transform: `translateX(${drag.dx}px) rotate(${rotation}deg)`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {currentPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentPhoto}
            alt={user.name}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
              <Dumbbell size={48} className="text-white/40" />
            </div>
          </div>
        )}

        {/* Tap zones for photo cycling. Only render when there's more than
            one photo so the card doesn't intercept clicks unnecessarily. */}
        {photoCount > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                setPhotoIdx((i) => (i - 1 + photoCount) % photoCount);
              }}
              className="absolute left-0 top-0 bottom-1/3 w-1/3 z-10"
            />
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                setPhotoIdx((i) => (i + 1) % photoCount);
              }}
              className="absolute right-0 top-0 bottom-1/3 w-1/3 z-10"
            />
            {/* Dot indicator across the top */}
            <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
              {user.photos.map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 flex-1 rounded-full transition-colors ${
                    i === photoIdx ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* LIKE / NOPE stamps that fade in as the user drags */}
        <div
          className="absolute top-6 left-6 px-3 py-1 rounded-md border-4 border-emerald-400 text-emerald-400 text-2xl font-extrabold rotate-[-15deg] pointer-events-none"
          style={{ opacity: likeStamp }}
        >
          LIKE
        </div>
        <div
          className="absolute top-6 right-6 px-3 py-1 rounded-md border-4 border-rose-500 text-rose-500 text-2xl font-extrabold rotate-[15deg] pointer-events-none"
          style={{ opacity: nopeStamp }}
        >
          NOPE
        </div>

        {/* Report button — tucked top-right so it doesn't compete with the
            photo carousel taps. Sits above carousel tap-zones via z-20. */}
        <button
          type="button"
          aria-label="Report user"
          data-testid="report-user"
          onClick={(e) => {
            e.stopPropagation();
            onReport(user);
          }}
          className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors"
        >
          <Flag size={14} />
        </button>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5">
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
          {user.overlap > 0 && (
            <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-xs font-semibold backdrop-blur-sm">
              <Clock size={11} />
              {user.overlap}× /wk overlap
            </div>
          )}
          {user.experienceLevel && (
            <p className="text-xs text-white/60 mt-1 capitalize">
              {user.experienceLevel} lifter
            </p>
          )}
          {user.bio && (
            <p className="text-sm text-white/90 mt-2 line-clamp-3">{user.bio}</p>
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
  // Surfaces a network / server failure with a single-click retry — keeps
  // the user inside the deck instead of bouncing them to a stale screen.
  return (
    <div className="rounded-3xl border border-destructive/40 bg-destructive/10 aspect-[3/4] flex flex-col items-center justify-center text-center px-6">
      <p className="text-sm text-destructive mb-4">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
