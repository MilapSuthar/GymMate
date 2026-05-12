"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const SPECIALTIES = [
  "Strength & Conditioning",
  "HIIT & Functional Fitness",
  "Bodybuilding & Hypertrophy",
  "Weight Loss & Lifestyle",
  "Sports Performance",
  "Yoga & Flexibility",
  "Pre & Postnatal Fitness",
  "Rehabilitation & Injury Recovery",
  "Nutrition & Wellness",
  "Other",
];

export default function BecomeTrainerPage() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    specialty: "",
    bio: "",
    pricePerSession: "",
    certifications: "",
    tags: "",
    gymName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.specialty || !form.bio.trim() || !form.pricePerSession) {
      toast.error("Specialty, bio and price are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/api/trainer/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          specialty: form.specialty,
          bio: form.bio.trim(),
          pricePerSession: parseFloat(form.pricePerSession),
          certifications: form.certifications.trim() || undefined,
          tags: form.tags.trim() || undefined,
          gymName: form.gymName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Registration failed");
      }
      toast.success("Trainer profile created!");
      router.push("/trainer/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Dumbbell size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Become a Trainer</h1>
          <p className="text-xs text-muted-foreground">
            List your services and start getting bookings
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Specialty */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Specialty *
          </label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f) => ({ ...f, specialty: s }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  form.specialty === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Bio * <span className="text-muted-foreground/60">({form.bio.length}/1000)</span>
          </label>
          <textarea
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[100px]"
            placeholder="Tell clients about your background, approach and what makes you different…"
            value={form.bio}
            maxLength={1000}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Price per session (£) *
          </label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="45"
            value={form.pricePerSession}
            onChange={(e) => setForm((f) => ({ ...f, pricePerSession: e.target.value }))}
            min={1}
            step={0.5}
            className="h-9 text-sm"
          />
        </div>

        {/* Certifications */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Certifications
          </label>
          <Input
            placeholder="REPS Level 3, Precision Nutrition…"
            value={form.certifications}
            onChange={(e) => setForm((f) => ({ ...f, certifications: e.target.value }))}
            className="h-9 text-sm"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Tags <span className="text-muted-foreground/60">(comma-separated)</span>
          </label>
          <Input
            placeholder="Powerlifting, Weight Loss, Beginners"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            className="h-9 text-sm"
          />
        </div>

        {/* Gym */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Gym / Studio name
          </label>
          <Input
            placeholder="PureGym City Centre"
            value={form.gymName}
            onChange={(e) => setForm((f) => ({ ...f, gymName: e.target.value }))}
            className="h-9 text-sm"
          />
        </div>

        <Button type="submit" disabled={submitting} className="gap-2 mt-2">
          {submitting ? "Creating profile…" : "Create trainer profile"}
          {!submitting && <ChevronRight size={15} />}
        </Button>
      </form>
    </div>
  );
}
