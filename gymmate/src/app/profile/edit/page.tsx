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
  MAX_PHOTOS,
  type ExperienceLevel,
  type FitnessGoal,
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
        }
      } finally {
        setFetching(false);
      }
    })();
  }, [authFetch, loading]);

  function toggleGoal(g: FitnessGoal) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
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
