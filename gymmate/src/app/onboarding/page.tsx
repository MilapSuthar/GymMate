"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Clock,
  Users,
  Camera,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  GENDERS,
  MAX_USER_AGE,
  MIN_ONBOARDING_SCHEDULE_SLOTS,
  MIN_USER_AGE,
  SCHEDULE_DAYS,
  SCHEDULE_SLOTS,
  type Gender,
  type ScheduleToken,
} from "@/lib/profile";

/**
 * GymMate onboarding flow.
 *
 * The bet: the *single* most important thing that distinguishes a working
 * GymMate user from a dead account is whether the schedule grid is populated.
 * Without it the overlap moat doesn't exist, the deck is ranked randomly,
 * and the app feels like every other dating-style swipe app.
 *
 * Onboarding makes the schedule the second screen — right after the intro —
 * because every other field can be filled in later but this one is the
 * conversion-driving signal.
 */

type StepKey = "intro" | "schedule" | "prefs" | "photo" | "done";

const STEPS: StepKey[] = ["intro", "schedule", "prefs", "photo", "done"];

interface OnboardingPhoto {
  id: string;
  url: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { authFetch, user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<StepKey>("intro");

  // ---- form state -----------------------------------------------------
  const [schedule, setSchedule] = useState<Set<ScheduleToken>>(new Set());
  const [gender, setGender] = useState<Gender | "">("");
  const [showMe, setShowMe] = useState<Gender[]>([]);
  const [minAgePref, setMinAgePref] = useState<string>("");
  const [maxAgePref, setMaxAgePref] = useState<string>("");
  const [photos, setPhotos] = useState<OnboardingPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hydrate from existing profile so a user who closed onboarding mid-way
  // picks up where they left off rather than starting from a blank slate.
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      try {
        const res = await authFetch("/api/profile");
        if (!res.ok) return;
        const data = await res.json();
        const p = data.profile;
        setSchedule(new Set((p.gymSchedule as ScheduleToken[]) ?? []));
        setGender((p.gender as Gender) ?? "");
        setShowMe((p.showMeGenders as Gender[]) ?? []);
        setMinAgePref(p.minAgePref != null ? String(p.minAgePref) : "");
        setMaxAgePref(p.maxAgePref != null ? String(p.maxAgePref) : "");
        setPhotos((p.photos as OnboardingPhoto[]) ?? []);
      } catch {
        // Silent — the user can still fill out the flow from scratch.
      }
    })();
  }, [authFetch, authLoading, user]);

  // ---- helpers --------------------------------------------------------
  const toggleSchedule = useCallback((token: ScheduleToken) => {
    setSchedule((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  }, []);

  const toggleShowMe = useCallback((g: Gender) => {
    setShowMe((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }, []);

  const advance = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx >= 0 && idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }, [step]);

  /**
   * Persist the user's choices to the profile API. We do this twice in the
   * flow: once after the prefs step (schedule + gender + age) and again after
   * the photo step is implicit (uploads write through their own endpoint).
   * Two writes keeps each step recoverable if the user closes the tab.
   */
  const savePrefs = useCallback(async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gender: gender || null,
          showMeGenders: showMe,
          minAgePref: minAgePref ? Number(minAgePref) : null,
          maxAgePref: maxAgePref ? Number(maxAgePref) : null,
          gymSchedule: Array.from(schedule),
        }),
      });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      toast.error("Couldn't save — check your connection and try again");
      return false;
    } finally {
      setSaving(false);
    }
  }, [authFetch, gender, showMe, minAgePref, maxAgePref, schedule]);

  const uploadPhoto = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await authFetch("/api/profile/photos", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          toast.error("Upload failed");
          return;
        }
        const data = await res.json();
        setPhotos((prev) => [...prev, data.photo]);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [authFetch]
  );

  const deletePhoto = useCallback(
    async (id: string) => {
      const res = await authFetch(`/api/profile/photos/${id}`, {
        method: "DELETE",
      });
      if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== id));
    },
    [authFetch]
  );

  // ---- step gating -----------------------------------------------------
  const canAdvanceFromSchedule = schedule.size >= MIN_ONBOARDING_SCHEDULE_SLOTS;
  const canAdvanceFromPrefs = !!gender && showMe.length > 0;
  const canAdvanceFromPhoto = photos.length > 0;

  // ---- progress dots --------------------------------------------------
  const visibleSteps = STEPS.filter((s) => s !== "done");
  const currentIdx = visibleSteps.indexOf(step === "done" ? "photo" : step);

  return (
    <div className="flex flex-col gap-6">
      {/* Progress dots — purely cosmetic but huge for perceived completion. */}
      {step !== "done" && (
        <div className="flex items-center gap-1.5">
          {visibleSteps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentIdx ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>
      )}

      {step === "intro" && (
        <Intro onStart={advance} />
      )}

      {step === "schedule" && (
        <ScheduleStep
          schedule={schedule}
          onToggle={toggleSchedule}
          canAdvance={canAdvanceFromSchedule}
          onNext={advance}
        />
      )}

      {step === "prefs" && (
        <PrefsStep
          gender={gender}
          setGender={setGender}
          showMe={showMe}
          toggleShowMe={toggleShowMe}
          minAgePref={minAgePref}
          setMinAgePref={setMinAgePref}
          maxAgePref={maxAgePref}
          setMaxAgePref={setMaxAgePref}
          saving={saving}
          canAdvance={canAdvanceFromPrefs}
          onNext={async () => {
            // Persist before moving on so the user's choices survive a refresh.
            const ok = await savePrefs();
            if (ok) advance();
          }}
        />
      )}

      {step === "photo" && (
        <PhotoStep
          photos={photos}
          uploading={uploading}
          onPick={() => fileInputRef.current?.click()}
          onDelete={deletePhoto}
          canAdvance={canAdvanceFromPhoto}
          onNext={advance}
          fileInputRef={fileInputRef}
          onFile={(f) => uploadPhoto(f)}
        />
      )}

      {step === "done" && (
        <Done onContinue={() => router.replace("/")} />
      )}

      {/* Skip link — present on every step except done. Not blocking, but
          the home page will still nudge with the completion banner. */}
      {step !== "intro" && step !== "done" && (
        <Link
          href="/"
          className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </Link>
      )}
    </div>
  );
}

// =============================================================
// STEP COMPONENTS
// =============================================================

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 pt-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
        <Sparkles size={28} />
      </div>
      <h1 className="text-2xl font-bold">Show up at the gym, not on the app</h1>
      <p className="text-sm text-muted-foreground">
        GymMate ranks people by when you&apos;d actually cross paths. Take 60
        seconds to tell us when you train and who you want to see, and we&apos;ll
        put the right lifters at the top of your deck.
      </p>
      <Button className="w-full mt-2 gap-2" onClick={onStart}>
        Get started <ChevronRight size={16} />
      </Button>
    </div>
  );
}

function ScheduleStep({
  schedule,
  onToggle,
  canAdvance,
  onNext,
}: {
  schedule: Set<ScheduleToken>;
  onToggle: (t: ScheduleToken) => void;
  canAdvance: boolean;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          <h2 className="text-lg font-bold">When do you train?</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Tap your usual gym times. Pick at least{" "}
          <span className="font-medium text-foreground">
            {MIN_ONBOARDING_SCHEDULE_SLOTS}
          </span>{" "}
          — the more you pick, the better we can match you.
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
                        onClick={() => onToggle(token)}
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

      <p className="text-xs text-muted-foreground">
        {schedule.size} / {MIN_ONBOARDING_SCHEDULE_SLOTS}+ selected
      </p>

      <Button onClick={onNext} disabled={!canAdvance} className="gap-2">
        Continue <ChevronRight size={16} />
      </Button>
    </div>
  );
}

function PrefsStep({
  gender,
  setGender,
  showMe,
  toggleShowMe,
  minAgePref,
  setMinAgePref,
  maxAgePref,
  setMaxAgePref,
  saving,
  canAdvance,
  onNext,
}: {
  gender: Gender | "";
  setGender: (g: Gender | "") => void;
  showMe: Gender[];
  toggleShowMe: (g: Gender) => void;
  minAgePref: string;
  setMinAgePref: (s: string) => void;
  maxAgePref: string;
  setMaxAgePref: (s: string) => void;
  saving: boolean;
  canAdvance: boolean;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <h2 className="text-lg font-bold">Who do you want to lift with?</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          These keep you off the wrong people&apos;s screens, and them off yours.
        </p>
      </div>

      <div className="flex flex-col gap-2">
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

      <div className="flex flex-col gap-2">
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

      <Button
        onClick={onNext}
        disabled={!canAdvance || saving}
        className="gap-2"
      >
        {saving ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <>
            Continue <ChevronRight size={16} />
          </>
        )}
      </Button>
    </div>
  );
}

function PhotoStep({
  photos,
  uploading,
  onPick,
  onDelete,
  canAdvance,
  onNext,
  fileInputRef,
  onFile,
}: {
  photos: OnboardingPhoto[];
  uploading: boolean;
  onPick: () => void;
  onDelete: (id: string) => void;
  canAdvance: boolean;
  onNext: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-primary" />
          <h2 className="text-lg font-bold">Add a photo</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          One good photo of the gym version of you. You can add more later.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative aspect-square rounded-xl overflow-hidden border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onDelete(p.id)}
              aria-label="Delete photo"
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-destructive transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {photos.length < 6 && (
          <button
            type="button"
            onClick={onPick}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-border bg-secondary/40 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Plus size={20} />
            )}
            <span className="text-xs mt-1">Add</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>

      <Button onClick={onNext} disabled={!canAdvance} className="gap-2">
        Continue <ChevronRight size={16} />
      </Button>
    </div>
  );
}

function Done({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 pt-12">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
        <Check size={32} />
      </div>
      <h1 className="text-2xl font-bold">You&apos;re ready</h1>
      <p className="text-sm text-muted-foreground">
        Lifters who share your schedule will float to the top of your deck.
        Pull-to-refresh tomorrow morning for a new batch.
      </p>
      <Button className="w-full mt-2" onClick={onContinue}>
        Open the deck
      </Button>
    </div>
  );
}
