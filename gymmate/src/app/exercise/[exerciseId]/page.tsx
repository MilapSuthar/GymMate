"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, TrendingUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  category: string;
  difficulty: string | null;
  equipment: string | null;
  description: string | null;
  videoUrl: string | null;
}

interface PR {
  weightKg: number;
  reps: number;
  volume: number;
  date: string;
}

interface SetRow {
  weightKg: string;
  reps: string;
}

interface WorkoutSet {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
}

interface WorkoutLog {
  id: string;
  date: string;
  sets: WorkoutSet[];
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 172800) return "Yesterday";
  return new Date(iso).toLocaleDateString();
}

export default function ExerciseDetailPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const router = useRouter();
  const { authFetch, loading: authLoading, user } = useAuth();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [pr, setPr] = useState<PR | null>(null);
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<SetRow[]>([{ weightKg: "", reps: "" }]);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [exRes, prRes, histRes] = await Promise.all([
        authFetch(`/api/exercises/${exerciseId}`),
        authFetch(`/api/exercises/${exerciseId}/pr`),
        authFetch("/api/workouts"),
      ]);
      if (!exRes.ok) throw new Error();
      const [exData, prData, histData] = await Promise.all([
        exRes.json(),
        prRes.json(),
        histRes.json(),
      ]);
      setExercise(exData.exercise);
      setPr(prData.pr ?? null);
      // Filter workout history to sets for this exercise
      const logs: WorkoutLog[] = (histData.workouts ?? [])
        .map((w: { id: string; date: string; sets: (WorkoutSet & { exercise: { id: string } })[] }) => ({
          id: w.id,
          date: w.date,
          sets: w.sets.filter((s) => s.exercise?.id === exerciseId),
        }))
        .filter((w: WorkoutLog) => w.sets.length > 0);
      setHistory(logs);
    } catch {
      toast.error("Failed to load exercise");
    } finally {
      setLoading(false);
    }
  }, [authFetch, exerciseId]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchAll();
  }, [authLoading, user, fetchAll]);

  const addSet = () =>
    setSets((prev) => [...prev, { weightKg: "", reps: "" }]);

  const removeSet = (i: number) =>
    setSets((prev) => prev.filter((_, idx) => idx !== i));

  const updateSet = (i: number, field: keyof SetRow, value: string) =>
    setSets((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s))
    );

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const validSets = sets.filter(
      (s) => s.weightKg.trim() !== "" && s.reps.trim() !== ""
    );
    if (!validSets.length) {
      toast.error("Add at least one complete set");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/api/workouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          sets: validSets.map((s) => ({
            weightKg: parseFloat(s.weightKg),
            reps: parseInt(s.reps, 10),
          })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Workout logged!");
      setSets([{ weightKg: "", reps: "" }]);
      await fetchAll();
    } catch {
      toast.error("Failed to log workout");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="h-6 w-20 bg-muted rounded animate-pulse mb-4" />
        <div className="h-32 bg-card border border-border rounded-2xl animate-pulse mb-4" />
        <div className="h-40 bg-card border border-border rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="px-4 pt-6 text-center text-muted-foreground py-16">
        Exercise not found.
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Exercise info card */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
            <Play size={16} className="text-primary" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight mb-1">
              {exercise.name}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs capitalize">
                {exercise.muscleGroup}
              </Badge>
              <Badge variant="secondary" className="text-xs capitalize">
                {exercise.category}
              </Badge>
              {exercise.difficulty && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {exercise.difficulty}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {exercise.equipment && (
          <p className="text-xs text-muted-foreground mb-2">
            <span className="font-medium">Equipment:</span> {exercise.equipment}
          </p>
        )}

        {exercise.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {exercise.description}
          </p>
        )}

        {/* Video placeholder */}
        {exercise.videoUrl && (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline"
          >
            <Play size={13} fill="currentColor" />
            Watch demo video
          </a>
        )}
      </div>

      {/* PR card */}
      {pr && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <TrendingUp size={20} className="text-primary shrink-0" />
          <div>
            <p className="text-xs text-primary font-medium mb-0.5">
              Personal Record
            </p>
            <p className="text-sm font-bold">
              {pr.weightKg}kg × {pr.reps} reps
            </p>
            <p className="text-xs text-muted-foreground">{timeAgo(pr.date)}</p>
          </div>
        </div>
      )}

      {/* Log workout form */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">Log sets</h2>
        <form onSubmit={handleLog}>
          {/* Header row */}
          <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 mb-2">
            <span className="text-xs text-muted-foreground text-center">#</span>
            <span className="text-xs text-muted-foreground">Weight (kg)</span>
            <span className="text-xs text-muted-foreground">Reps</span>
            <span />
          </div>
          {sets.map((s, i) => (
            <div
              key={i}
              className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 mb-2 items-center"
            >
              <span className="text-xs text-muted-foreground text-center">
                {i + 1}
              </span>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="80"
                value={s.weightKg}
                onChange={(e) => updateSet(i, "weightKg", e.target.value)}
                min={0}
                step={0.5}
                className="h-9 text-sm"
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="8"
                value={s.reps}
                onChange={(e) => updateSet(i, "reps", e.target.value)}
                min={1}
                className="h-9 text-sm"
              />
              <button
                type="button"
                onClick={() => removeSet(i)}
                disabled={sets.length === 1}
                className="flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={addSet}
            >
              <Plus size={13} />
              Add set
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="ml-auto"
            >
              {submitting ? "Logging…" : "Log workout"}
            </Button>
          </div>
        </form>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground">
            Recent sessions
          </h2>
          <div className="flex flex-col gap-2">
            {history.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="bg-card border border-border rounded-xl p-3"
              >
                <p className="text-xs text-muted-foreground mb-1.5">
                  {timeAgo(log.date)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {log.sets.map((s) => (
                    <span
                      key={s.id}
                      className="text-xs bg-secondary rounded-lg px-2 py-0.5"
                    >
                      {s.weightKg}kg × {s.reps}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
