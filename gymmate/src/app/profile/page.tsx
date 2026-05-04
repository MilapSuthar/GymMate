"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Dumbbell, MapPin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

interface Profile {
  id: string;
  name: string;
  displayName: string | null;
  bio: string | null;
  age: number | null;
  gymName: string | null;
  fitnessGoals: string[];
  experienceLevel: string | null;
  photos: { id: string; url: string; position: number }[];
  email?: string;
}

export default function ProfilePage() {
  const { authFetch, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    (async () => {
      try {
        const res = await authFetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
        }
      } finally {
        setFetching(false);
      }
    })();
  }, [authFetch, loading]);

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return <div className="px-4 pt-6 text-muted-foreground">Could not load profile.</div>;
  }

  const cover = profile.photos[0]?.url;

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-sm">How others see you</p>
        </div>
        <Link
          href="/profile/edit"
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[12px] text-[0.8rem] font-medium border border-border bg-background hover:bg-muted transition-colors"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="relative aspect-[4/5] bg-gradient-to-b from-violet-900 to-indigo-900">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
                <Dumbbell size={48} className="text-white/40" />
              </div>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
            <h2 className="text-xl font-bold text-white">
              {profile.displayName || profile.name}
              {profile.age ? <span className="font-normal">, {profile.age}</span> : null}
            </h2>
            {profile.gymName && (
              <div className="flex items-center gap-1 text-white/70 text-sm mt-0.5">
                <MapPin size={13} />
                <span>{profile.gymName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {profile.bio ? (
        <section className="mt-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">About</h3>
          <p className="text-sm leading-relaxed">{profile.bio}</p>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground mt-5 italic">
          No bio yet. <Link href="/profile/edit" className="text-primary underline">Add one</Link>.
        </p>
      )}

      {profile.experienceLevel && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Experience
          </h3>
          <Badge variant="secondary" className="capitalize">{profile.experienceLevel}</Badge>
        </section>
      )}

      {profile.fitnessGoals.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Goals</h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.fitnessGoals.map((g) => (
              <Badge key={g} variant="secondary" className="capitalize">{g.replace("-", " ")}</Badge>
            ))}
          </div>
        </section>
      )}

      {profile.photos.length > 1 && (
        <section className="mt-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Photos ({profile.photos.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {profile.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.url}
                alt=""
                className="aspect-square w-full object-cover rounded-xl border border-border"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
