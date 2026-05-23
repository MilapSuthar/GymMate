"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, X, Dumbbell, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

interface LikeUser {
  id: string;
  name: string;
  age: number | null;
  bio: string | null;
  gymName: string | null;
  photoUrl: string | null;
  photos: string[];
  fitnessGoals: string[];
  experienceLevel: string | null;
  likedAt: string;
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
  // Stable per-user gradient so a card keeps its color across re-renders.
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

export default function LikesPage() {
  const router = useRouter();
  const { user, authFetch, loading: authLoading } = useAuth();

  const [likes, setLikes] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/likes");
      if (!res.ok) throw new Error("Failed to load likes");
      const data = await res.json();
      setLikes(data.likes ?? []);
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

  const act = useCallback(
    async (target: LikeUser, direction: "like" | "pass") => {
      if (pendingId) return; // debounce while a request is in flight
      setPendingId(target.id);
      // Optimistically clear the card.
      setLikes((prev) => prev.filter((u) => u.id !== target.id));
      try {
        const res = await authFetch("/api/swipe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ swipeeId: target.id, direction }),
        });
        if (!res.ok) {
          // Put the card back so the user doesn't silently lose them.
          setLikes((prev) => [target, ...prev]);
          return;
        }
        const data = await res.json();
        // Liking back is always mutual here — drop straight into the chat.
        if (data.isMatch && data.match?.id) {
          router.push(`/matches/${data.match.id}`);
        }
      } catch {
        setLikes((prev) => [target, ...prev]);
      } finally {
        setPendingId(null);
      }
    },
    [authFetch, pendingId, router]
  );

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => router.push("/")}
          aria-label="Back to Match"
          className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors -ml-1"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold">Likes You</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-4 pl-10">
        {isLoading
          ? "Loading…"
          : likes.length === 0
          ? "No new likes right now"
          : `${likes.length} ${
              likes.length === 1 ? "person likes" : "people like"
            } you — like them back to match instantly`}
      </p>

      {isLoading || authLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-secondary/60 aspect-[3/4] animate-pulse"
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
      ) : likes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 flex flex-col items-center justify-center text-center px-6 py-14">
          <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-4">
            <Heart size={28} fill="currentColor" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No likes yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Keep swiping — when someone likes you, they&apos;ll show up here.
          </p>
          <Link href="/">
            <Button variant="secondary">Back to Match</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {likes.map((u) => (
            <div key={u.id} className="flex flex-col">
              <div
                className={`relative rounded-2xl overflow-hidden aspect-[3/4] bg-gradient-to-b ${gradientFor(
                  u.id
                )}`}
              >
                {u.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.photos[0]}
                    alt={u.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                      <Dumbbell size={36} className="text-white/40" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3">
                  <h3 className="text-sm font-bold text-white truncate">
                    {u.name}
                    {u.age ? `, ${u.age}` : ""}
                  </h3>
                  {u.gymName && (
                    <p className="text-[11px] text-white/70 truncate">
                      {u.gymName}
                    </p>
                  )}
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-2 mt-2">
                <button
                  aria-label={`Pass on ${u.name}`}
                  disabled={!!pendingId}
                  onClick={() => act(u, "pass")}
                  className="flex-1 h-10 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-destructive/20 hover:border-destructive transition-colors disabled:opacity-50"
                >
                  <X size={18} className="text-muted-foreground" />
                </button>
                <button
                  aria-label={`Like ${u.name} back`}
                  disabled={!!pendingId}
                  onClick={() => act(u, "like")}
                  className="flex-1 h-10 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg shadow-primary/30 disabled:opacity-50"
                >
                  {pendingId === u.id ? (
                    <Loader2
                      size={18}
                      className="animate-spin text-primary-foreground"
                    />
                  ) : (
                    <Heart
                      size={18}
                      className="text-primary-foreground"
                      fill="currentColor"
                    />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footnote nudge — reinforces that every like here is a guaranteed match */}
      {!isLoading && likes.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-6">
          <Sparkles size={13} className="text-primary" />
          <span>Every like back here is an instant match</span>
        </div>
      )}
    </div>
  );
}
