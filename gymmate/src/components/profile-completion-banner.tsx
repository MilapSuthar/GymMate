"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Profile {
  bio: string | null;
  photos: { id: string }[];
}

/**
 * Renders a "complete your profile" CTA on /match when the user hasn't yet
 * filled in their bio or uploaded a photo. Disappears once both are present.
 */
export default function ProfileCompletionBanner() {
  const { authFetch, user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/profile");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setProfile({
            bio: data.profile.bio,
            photos: data.profile.photos ?? [],
          });
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, loading, user]);

  if (loading || fetching || !profile) return null;

  const hasBio = !!profile.bio && profile.bio.trim().length > 0;
  const hasPhoto = profile.photos.length > 0;
  if (hasBio && hasPhoto) return null;

  const missing = [!hasBio && "a bio", !hasPhoto && "a photo"].filter(Boolean) as string[];

  return (
    <Link
      href="/profile/edit"
      data-testid="profile-completion-banner"
      className="block bg-primary/10 border border-primary/30 rounded-2xl p-3.5 mb-4 group hover:bg-primary/15 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Sparkles size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Complete your profile</p>
          <p className="text-xs text-muted-foreground">
            Add {missing.join(" and ")} so others can match with you.
          </p>
        </div>
        <ArrowRight size={16} className="text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
