"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Plus, X, CheckCircle2 } from "lucide-react";

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MealPlan {
  id: string;
  title: string;
  description: string | null;
  caloriesPerDay: number;
  proteinPerDay: number | null;
  carbsPerDay: number | null;
  fatsPerDay: number | null;
  durationWeeks: number | null;
  price: number;
  tags: string[];
  dietitian: string;
  purchased: boolean;
}

const CALORIE_TARGET = 2000;
const PROTEIN_TARGET = 150;
const CARBS_TARGET = 250;
const FATS_TARGET = 70;

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {Math.round(current)}g / {target}g
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function NutritionPage() {
  const { authFetch, loading: authLoading, user } = useAuth();
  const [totals, setTotals] = useState<Totals>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    mealType: "snack" as MealType,
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, plansRes] = await Promise.all([
        authFetch("/api/nutrition/log"),
        authFetch("/api/nutrition/meal-plans"),
      ]);
      if (logRes.ok) {
        const d = await logRes.json();
        setTotals(d.totals);
      }
      if (plansRes.ok) {
        const d = await plansRes.json();
        setPlans(d.plans);
      }
    } catch {
      toast.error("Failed to load nutrition data");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();
  }, [authLoading, user, fetchData]);

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.calories) {
      toast.error("Name and calories are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/api/nutrition/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          mealType: form.mealType,
          calories: parseInt(form.calories, 10),
          protein: parseFloat(form.protein) || 0,
          carbs: parseFloat(form.carbs) || 0,
          fats: parseFloat(form.fats) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Food logged!");
      setForm({ name: "", mealType: "snack", calories: "", protein: "", carbs: "", fats: "" });
      setShowLog(false);
      await fetchData();
    } catch {
      toast.error("Failed to log food");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuy = async (planId: string) => {
    setPurchasing(planId);
    try {
      const res = await authFetch(`/api/nutrition/meal-plans/${planId}/purchase`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed");
      }
      toast.success("Plan purchased!");
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, purchased: true } : p))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to purchase");
    } finally {
      setPurchasing(null);
    }
  };

  const caloriePercent = Math.min(
    Math.round((totals.calories / CALORIE_TARGET) * 100),
    100
  );
  const circumference = 2 * Math.PI * 15.9;
  const dashArray = `${(caloriePercent / 100) * circumference} ${circumference}`;

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-1">Nutrition</h1>
      <p className="text-muted-foreground text-sm mb-5">
        Today&apos;s intake &amp; meal plans
      </p>

      {/* Calorie ring */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 shrink-0">
            <svg
              className="w-full h-full -rotate-90"
              viewBox="0 0 36 36"
            >
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-secondary"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray={loading ? "0 100" : dashArray}
                strokeLinecap="round"
                className="text-primary transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold">{caloriePercent}%</span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">
              Calories today
            </p>
            <p className="text-2xl font-bold">{totals.calories}</p>
            <p className="text-xs text-muted-foreground">
              of {CALORIE_TARGET} kcal
            </p>
          </div>
          <Button
            size="sm"
            className="ml-auto gap-1 shrink-0"
            onClick={() => setShowLog(true)}
          >
            <Plus size={14} />
            Log food
          </Button>
        </div>

        <div className="flex flex-col gap-2.5 mt-4">
          <MacroBar
            label="Protein"
            current={totals.protein}
            target={PROTEIN_TARGET}
            color="bg-blue-500"
          />
          <MacroBar
            label="Carbs"
            current={totals.carbs}
            target={CARBS_TARGET}
            color="bg-amber-500"
          />
          <MacroBar
            label="Fats"
            current={totals.fats}
            target={FATS_TARGET}
            color="bg-rose-500"
          />
        </div>
      </div>

      {/* Log food bottom sheet */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowLog(false)}
          />
          <div className="relative bg-card border border-border rounded-t-2xl w-full p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Log food</h2>
              <button
                onClick={() => setShowLog(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleLog} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Food name *
                </label>
                <Input
                  placeholder="e.g. Chicken breast 200g"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Meal type
                </label>
                <div className="flex gap-2 flex-wrap">
                  {MEAL_TYPES.map((mt) => (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, mealType: mt }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors border ${
                        form.mealType === mt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Calories (kcal) *
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="350"
                    value={form.calories}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, calories: e.target.value }))
                    }
                    min={0}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Protein (g)
                  </label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="30"
                    value={form.protein}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, protein: e.target.value }))
                    }
                    min={0}
                    step={0.1}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Carbs (g)
                  </label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="40"
                    value={form.carbs}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, carbs: e.target.value }))
                    }
                    min={0}
                    step={0.1}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Fats (g)
                  </label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="12"
                    value={form.fats}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fats: e.target.value }))
                    }
                    min={0}
                    step={0.1}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="mt-1">
                {submitting ? "Logging…" : "Save entry"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Meal plans */}
      <h2 className="text-base font-semibold mb-3">Meal Plans</h2>
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-4 h-[100px] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="font-semibold text-sm">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">{p.dietitian}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-bold text-sm">£{p.price}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.durationWeeks ? `${p.durationWeeks} weeks` : "Ongoing"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                {p.caloriesPerDay} kcal/day
                {p.proteinPerDay ? ` · P ${p.proteinPerDay}g` : ""}
                {p.carbsPerDay ? ` · C ${p.carbsPerDay}g` : ""}
                {p.fatsPerDay ? ` · F ${p.fatsPerDay}g` : ""}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1.5 flex-wrap">
                  {p.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {p.purchased ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-3 ml-2 shrink-0 gap-1 text-primary border-primary/30"
                    disabled
                  >
                    <CheckCircle2 size={12} />
                    View
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-3 ml-2 shrink-0"
                    disabled={purchasing === p.id}
                    onClick={() => handleBuy(p.id)}
                  >
                    {purchasing === p.id ? "…" : "Buy"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
