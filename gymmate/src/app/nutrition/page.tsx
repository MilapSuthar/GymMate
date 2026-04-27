import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const macros = [
  { label: "Protein", current: 142, target: 180, color: "bg-blue-500" },
  { label: "Carbs", current: 210, target: 280, color: "bg-amber-500" },
  { label: "Fats", current: 48, target: 70, color: "bg-rose-500" },
];

const plans = [
  {
    id: 1,
    title: "High Protein Cut",
    dietitian: "Dr. Emma Walsh",
    calories: 1900,
    duration: "8 weeks",
    tags: ["Fat Loss", "Muscle Retention"],
    price: 29,
  },
  {
    id: 2,
    title: "Clean Bulk",
    dietitian: "James Okafor RD",
    calories: 2800,
    duration: "12 weeks",
    tags: ["Muscle Gain", "Performance"],
    price: 35,
  },
  {
    id: 3,
    title: "Balanced Maintenance",
    dietitian: "Sofia Reyes RD",
    calories: 2200,
    duration: "Ongoing",
    tags: ["Maintenance", "Flexible"],
    price: 19,
  },
];

export default function NutritionPage() {
  const totalCalories = 1640;
  const targetCalories = 2000;
  const caloriePercent = Math.round((totalCalories / targetCalories) * 100);

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-1">Nutrition</h1>
      <p className="text-muted-foreground text-sm mb-5">Today's intake & meal plans</p>

      {/* Calorie ring */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-secondary" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeDasharray={`${caloriePercent} 100`}
                strokeLinecap="round"
                className="text-primary"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold">{caloriePercent}%</span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Calories today</p>
            <p className="text-2xl font-bold">{totalCalories}</p>
            <p className="text-xs text-muted-foreground">of {targetCalories} kcal</p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 mt-4">
          {macros.map((m) => {
            const pct = Math.round((m.current / m.target) * 100);
            return (
              <div key={m.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground">{m.current}g / {m.target}g</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${m.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meal plans */}
      <h2 className="text-base font-semibold mb-3">Meal Plans</h2>
      <div className="flex flex-col gap-3">
        {plans.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="font-semibold text-sm">{p.title}</h3>
                <p className="text-xs text-muted-foreground">{p.dietitian}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">£{p.price}</p>
                <p className="text-xs text-muted-foreground">{p.duration}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{p.calories} kcal/day</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {p.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7 px-3 ml-2 shrink-0">
                View
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
