"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import {
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  GENDERS,
  MAX_PHOTOS,
  MAX_USER_AGE,
  MIN_USER_AGE,
  SCHEDULE_DAYS,
  SCHEDULE_SLOTS,
  type ExperienceLevel,
  type FitnessGoal,
  type Gender,
  type ScheduleToken,
} from "@/lib/profile";

interface ProfilePhoto {
  id: string;
  url: string;
  position: number;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { authFetch, loading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [gymName, setGymName] = useState("");
  const [age, setAge] = useState<string>("");
  const [goals, setGoals] = useState<FitnessGoal[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">("");
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  // Match preferences
  const [gender, setGender] = useState<Gender | "">("");
  const [showMe, setShowMe] = useState<Gender[]>([]);
  const [minAgePref, setMinAgePref] = useState<string>("");
  const [maxAgePref, setMaxAgePref] = useState<string>("");
  // Schedule — a Set is the natural shape for "is this cell selected" lookups.
  const [schedule, setSchedule] = useState<Set<ScheduleToken>>(new Set());

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (loading) return;
    (async () => {
      try {
        const res = await authFetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const p = data.profile;
          setDisplayName(p.displayName ?? "");
          setBio(p.bio ?? "");
          setGymName(p.gymName ?? "");
          setAge(p.age ? String(p.age) : "");
          setGoals(p.fitnessGoals ?? []);
          setExperienceLevel((p.experienceLevel as ExperienceLevel) ?? "");
          setPhotos(p.photos ?? []);
          setGender((p.gender as Gender) ?? "");
          setShowMe((p.showMeGenders as Gender[]) ?? []);
          setMinAgePref(p.minAgePref != null ? String(p.minAgePref) : "");
          setMaxAgePref(p.maxAgePref != null ? String(p.maxAgePref) : "");
          setSchedule(new Set((p.gymSchedule as ScheduleToken[]) ?? []));
        }
      } finally {
        setFetching(false);
      }
    })();
  }, [authFetch, loading]);

  function toggleGoal(g: FitnessGoal) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function toggleShowMe(g: Gender) {
    setShowMe((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function toggleSchedule(token: ScheduleToken) {
    setSchedule((prev) => {
      // Sets are mutable but React state needs a new reference to re-render.
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await authFetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: displayName || null,
          bio: bio || null,
          gymName: gymName || null,
          age: age ? Number(age) : null,
          fitnessGoals: goals,
          experienceLevel: experienceLevel || null,
          gender: gender || null,
          showMeGenders: showMe,
          minAgePref: minAgePref ? Number(minAgePref) : null,
          maxAgePref: maxAgePref ? Number(maxAgePref) : null,
          gymSchedule: Array.from(schedule),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to save");
        return;
      }
      setSuccess("Saved");
      setTimeout(() => router.push("/profile"), 400);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await authFetch("/api/profile/photos", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Upload failed");
        return;
      }
      setPhotos((prev) => [...prev, data.photo]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(photoId: string) {
    setError(null);
    const res = await authFetch(`/api/profile/photos/${photoId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Delete failed");
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-2 mb-5">
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5" data-testid="profile-edit-form">
        {/* Photos */}
        <section>
          <Label className="block mb-2">
            Photos <span className="text-muted-foreground font-normal">({photos.length}/{MAX_PHOTOS})</span>
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  aria-label="Delete photo"
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-destructive transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-border bg-secondary/40 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                <span className="text-xs mt-1">Add</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleUpload}
            />
          </div>
        </section>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What other gym-goers see"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people what you train, your routine, what you're looking for…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gym">Gym</Label>
            <Input
              id="gym"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="e.g. PureGym City Centre"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min={13}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="—"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Fitness goals</Label>
          <div className="flex flex-wrap gap-2">
            {FITNESS_GOALS.map((g) => {
              const active = goals.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGoal(g)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g.replace("-", " ")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Experience level</Label>
          <div className="flex gap-2">
            {EXPERIENCE_LEVELS.map((level) => {
              const active = experienceLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setExperienceLevel(active ? "" : level)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors capitalize ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        {/* === Gym schedule ================================================
            The moat feature. Tap the slots you're typically at the gym;
            discover ranks candidates by how many slots you share so the
            top of your deck is people you'd actually cross paths with. */}
        <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold">When you train</h2>
            <p className="text-xs text-muted-foreground">
              Tap the times you&apos;re usually at the gym. We&apos;ll match
              you with people whose schedule overlaps yours — the lifters
              you&apos;d actually run into.
            </p>
          </div>

          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-normal pr-2 pb-1"></th>
                  {SCHEDULE_DAYS.map((d) => (
                    <th
                      key={d}
                      className="font-medium capitalize pb-1 px-0.5 text-center"
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCHEDULE_SLOTS.map((slot) => (
                  <tr key={slot.key}>
                    <td className="pr-2 py-0.5 align-middle whitespace-nowrap">
                      <div className="text-foreground font-medium">{slot.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-none">
                        {slot.hint}
                      </div>
                    </td>
                    {SCHEDULE_DAYS.map((day) => {
                      const token = `${day}_${slot.key}` as ScheduleToken;
                      const active = schedule.has(token);
                      return (
                        <td key={day} className="p-0.5 align-middle">
                          <button
                            type="button"
                            onClick={() => toggleSchedule(token)}
                            aria-pressed={active}
                            aria-label={`${day} ${slot.label}`}
                            className={`w-full h-8 rounded-md border text-xs transition-colors ${
                              active
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-secondary border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {schedule.size} slot{schedule.size === 1 ? "" : "s"} selected
          </p>
        </section>

        {/* === Match preferences ============================================
            These four controls drive the safety + relevance of discover.
            We render them inside a bordered section so users see them as
            a distinct unit from "what other people see about me". */}
        <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">Match preferences</h2>
            <p className="text-xs text-muted-foreground">
              These help us show you the right gym-goers — and keep you off
              other people&apos;s screens if you&apos;re not who they&apos;re
              looking for.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>I am</Label>
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map((g) => {
                const active = gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(active ? "" : g)}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors capitalize ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g.replace("_", "-")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Show me</Label>
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map((g) => {
                const active = showMe.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleShowMe(g)}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors capitalize ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g.replace("_", "-")}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave all unselected to see everyone.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="minAge">Min age</Label>
              <Input
                id="minAge"
                type="number"
                min={MIN_USER_AGE}
                max={MAX_USER_AGE}
                value={minAgePref}
                onChange={(e) => setMinAgePref(e.target.value)}
                placeholder={String(MIN_USER_AGE)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxAge">Max age</Label>
              <Input
                id="maxAge"
                type="number"
                min={MIN_USER_AGE}
                max={MAX_USER_AGE}
                value={maxAgePref}
                onChange={(e) => setMaxAgePref(e.target.value)}
                placeholder={String(MAX_USER_AGE)}
              />
            </div>
          </div>
        </section>

        {error && (
          <p
            role="alert"
            data-testid="profile-edit-error"
            className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-primary bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
            {success}
          </p>
        )}

        <Button type="submit" disabled={saving} className="mt-2">
          {saving ? <Loader2 className="animate-spin" size={16} /> : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
