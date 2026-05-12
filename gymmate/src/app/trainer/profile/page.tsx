"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface TrainerProfile {
  specialty: string;
  bio: string | null;
  pricePerSession: number;
  certifications: string | null;
  tags: string[];
  gym: string | null;
}

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

export default function TrainerProfileEditPage() {
  const router = useRouter();
  const { authFetch, loading: authLoading, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    specialty: "",
    bio: "",
    pricePerSession: "",
    certifications: "",
    tags: "",
    gymName: "",
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/trainer/profile");
      if (res.status === 404) {
        router.replace("/become-trainer");
        return;
      }
      if (!res.ok) throw new Error();
      const data: { trainer: TrainerProfile } = await res.json();
      const t = data.trainer;
      setForm({
        specialty: t.specialty,
        bio: t.bio ?? "",
        pricePerSession: String(t.pricePerSession),
        certifications: t.certifications ?? "",
        tags: t.tags.join(", "),
        gymName: t.gym ?? "",
      });
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [authFetch, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchProfile();
  }, [authLoading, user, fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch("/api/trainer/profile", {
        method: "PUT",
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
      if (!res.ok) throw new Error();
      toast.success("Profile updated!");
      router.push("/trainer/dashboard");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="h-6 w-24 bg-muted rounded animate-pulse mb-4" />
        <div className="h-[400px] bg-card border border-border rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-xl font-bold mb-5">Edit Trainer Profile</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {/* Specialty */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Specialty</label>
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
            Bio <span className="text-muted-foreground/60">({form.bio.length}/1000)</span>
          </label>
          <textarea
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[100px]"
            value={form.bio}
            maxLength={1000}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Price per session (£)
          </label>
          <Input
            type="number"
            inputMode="decimal"
            value={form.pricePerSession}
            onChange={(e) => setForm((f) => ({ ...f, pricePerSession: e.target.value }))}
            min={1}
            step={0.5}
            className="h-9 text-sm"
          />
        </div>

        {/* Certifications */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Certifications</label>
          <Input
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
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            className="h-9 text-sm"
          />
        </div>

        {/* Gym */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Gym / Studio name</label>
          <Input
            value={form.gymName}
            onChange={(e) => setForm((f) => ({ ...f, gymName: e.target.value }))}
            className="h-9 text-sm"
          />
        </div>

        <Button type="submit" disabled={saving} className="gap-2 mt-2">
          <Save size={14} />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
