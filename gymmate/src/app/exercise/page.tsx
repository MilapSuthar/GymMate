"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Play, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  category: string;
  difficulty: string | null;
  equipment: string | null;
  pr: { weightKg: number; reps: number } | null;
}

const MUSCLE_FILTERS = [
  { label: "All", value: "" },
  { label: "Chest", value: "chest" },
  { label: "Back", value: "back" },
  { label: "Legs", value: "legs" },
  { label: "Shoulders", value: "shoulders" },
  { label: "Arms", value: "arms" },
  { label: "Core", value: "core" },
  { label: "Cardio", value: "cardio" },
];

const TYPE_FILTERS = [
  { label: "All Types", value: "" },
  { label: "Push", value: "push" },
  { label: "Pull", value: "pull" },
  { label: "Legs", value: "legs" },
  { label: "Cardio", value: "cardio" },
];

const MUSCLE_COLORS: Record<string, string> = {
  chest: "bg-rose-500/15 text-rose-400",
  back: "bg-sky-500/15 text-sky-400",
  legs: "bg-emerald-500/15 text-emerald-400",
  shoulders: "bg-violet-500/15 text-violet-400",
  arms: "bg-amber-500/15 text-amber-400",
  core: "bg-orange-500/15 text-orange-400",
  cardio: "bg-pink-500/15 text-pink-400",
};

export default function ExercisePage() {
  const { authFetch, loading: authLoading, user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [muscle, setMuscle] = useState("");
  const [type, setType] = useState("");

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (muscle) params.set("muscleGroup", muscle);
      if (type) params.set("category", type);
      const res = await authFetch(`/api/exercises?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExercises(data.exercises);
    } catch {
      toast.error("Failed to load exercises");
    } finally {
      setLoading(false);
    }
  }, [authFetch, muscle, type]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchExercises();
  }, [authLoading, user, fetchExercises]);

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-1">Exercise Library</h1>
      <p className="text-muted-foreground text-sm mb-4">
        Browse, watch, and log your lifts
      </p>

      {/* Muscle group filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 scrollbar-none">
        {MUSCLE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setMuscle(f.value)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              muscle === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setType(f.value)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              type === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-4 h-[72px] animate-pulse"
            />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No exercises found for this filter.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {exercises.map((ex) => (
            <Link
              key={ex.id}
              href={`/exercise/${ex.id}`}
              className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/40 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Play size={16} className="text-primary" fill="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <h3 className="font-semibold text-sm">{ex.name}</h3>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {ex.category}
                  </Badge>
                </div>
                <p
                  className={`text-xs font-medium capitalize inline-block px-1.5 py-0.5 rounded ${
                    MUSCLE_COLORS[ex.muscleGroup] ?? "text-muted-foreground"
                  }`}
                >
                  {ex.muscleGroup}
                  {ex.difficulty ? ` · ${ex.difficulty}` : ""}
                </p>
              </div>
              {ex.pr && (
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end text-primary text-xs mb-0.5">
                    <TrendingUp size={12} />
                    <span className="font-medium">PR</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ex.pr.weightKg}kg × {ex.pr.reps}
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
