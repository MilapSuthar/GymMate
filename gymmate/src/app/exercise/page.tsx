import { Play, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const categories = ["All", "Push", "Pull", "Legs", "Core", "Cardio"];

const exercises = [
  { id: 1, name: "Bench Press", muscle: "Chest", category: "Push", pr: "100kg × 5", sets: 4 },
  { id: 2, name: "Pull-Up", muscle: "Back", category: "Pull", pr: "BW+20kg × 8", sets: 3 },
  { id: 3, name: "Squat", muscle: "Quads", category: "Legs", pr: "140kg × 3", sets: 5 },
  { id: 4, name: "Overhead Press", muscle: "Shoulders", category: "Push", pr: "72.5kg × 5", sets: 4 },
  { id: 5, name: "Romanian Deadlift", muscle: "Hamstrings", category: "Legs", pr: "120kg × 8", sets: 3 },
  { id: 6, name: "Barbell Row", muscle: "Back", category: "Pull", pr: "100kg × 6", sets: 4 },
];

export default function ExercisePage() {
  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-1">Exercise Library</h1>
      <p className="text-muted-foreground text-sm mb-4">Browse, watch, and log your lifts</p>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {categories.map((cat, i) => (
          <button
            key={cat}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              i === 0
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {exercises.map((ex) => (
          <div key={ex.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Play size={18} className="text-primary" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-sm">{ex.name}</h3>
                <Badge variant="secondary" className="text-xs">{ex.category}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{ex.muscle} · {ex.sets} sets</p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 justify-end text-primary text-xs mb-0.5">
                <TrendingUp size={12} />
                <span className="font-medium">PR</span>
              </div>
              <p className="text-xs text-muted-foreground">{ex.pr}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
