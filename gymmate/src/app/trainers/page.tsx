"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star, MapPin, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Trainer {
  id: string;
  name: string;
  photoUrl: string | null;
  gym: string | null;
  specialty: string;
  bio: string | null;
  pricePerSession: number;
  tags: string[];
  verified: boolean;
  rating: number | null;
  reviewCount: number;
}

const SPECIALTY_FILTERS = [
  { label: "All", value: "" },
  { label: "Strength", value: "Strength" },
  { label: "HIIT", value: "HIIT" },
  { label: "Bodybuilding", value: "Bodybuilding" },
  { label: "Weight Loss", value: "Weight Loss" },
  { label: "Sports", value: "Sports" },
  { label: "Yoga", value: "Yoga" },
];

export default function TrainersPage() {
  const { authFetch, loading: authLoading, user } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState("");

  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    try {
      const params = specialty ? `?specialty=${encodeURIComponent(specialty)}` : "";
      const res = await authFetch(`/api/trainers${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTrainers(data.trainers);
    } catch {
      toast.error("Failed to load trainers");
    } finally {
      setLoading(false);
    }
  }, [authFetch, specialty]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchTrainers();
  }, [authLoading, user, fetchTrainers]);

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-1">Trainers</h1>
      <p className="text-muted-foreground text-sm mb-4">
        Certified PTs near your gym
      </p>

      {/* Specialty filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {SPECIALTY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setSpecialty(f.value)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              specialty === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-4 h-[140px] animate-pulse"
            />
          ))}
        </div>
      ) : trainers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No trainers found for this filter.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {trainers.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-xl font-bold text-muted-foreground shrink-0">
                  {t.photoUrl ? (
                    <img
                      src={t.photoUrl}
                      alt={t.name}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    t.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm">{t.name}</span>
                    {t.verified && (
                      <CheckCircle size={14} className="text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.specialty}</p>
                  {t.gym && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin size={11} />
                      {t.gym}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold">£{t.pricePerSession}</div>
                  <div className="text-xs text-muted-foreground">/session</div>
                </div>
              </div>

              {t.rating !== null && (
                <div className="flex items-center gap-1 mt-3 mb-2">
                  <Star size={13} className="text-primary fill-primary" />
                  <span className="text-sm font-medium">{t.rating}</span>
                  <span className="text-xs text-muted-foreground">
                    ({t.reviewCount} reviews)
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 mb-3">
                {t.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <Link href={`/trainers/${t.id}`}>
                <Button className="w-full" size="sm">
                  Book a Session
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
