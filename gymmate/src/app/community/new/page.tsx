"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import {
  SPORT_TAGS,
  type SportTag,
  MIN_DURATION_MINS,
  MAX_DURATION_MINS,
  MIN_CAPACITY,
  MAX_CAPACITY,
} from "@/lib/meetup";

/**
 * Smallest sensible "schedule something now" form: title, sport, where, when,
 * how long, optional cap, optional notes. The server is authoritative on
 * validation (future date, sane bounds); the client checks just enough to
 * keep the submit button from firing on obviously-empty input.
 */
export default function NewMeetupPage() {
  const router = useRouter();
  const { authFetch } = useAuth();

  const [title, setTitle] = useState("");
  const [sportTag, setSportTag] = useState<SportTag>("strength");
  const [location, setLocation] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMins, setDurationMins] = useState(60);
  const [capacity, setCapacity] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        sportTag,
        location: location.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMins,
      };
      if (capacity.trim()) body.capacity = parseInt(capacity, 10);
      if (description.trim()) body.description = description.trim();

      const res = await authFetch("/api/meetups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Couldn't create the meetup");
        return;
      }
      router.push("/community");
    } catch {
      setError("Network error. Try again?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-md mx-auto w-full">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.push("/community")}
          aria-label="Back to Community"
          className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors -ml-1"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Post a meetup</h1>
          <p className="text-muted-foreground text-sm">
            Set a time and place — lifters will RSVP
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={120}
            placeholder="Powerlifting session — looking for spotters"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sportTag">Sport</Label>
          <select
            id="sportTag"
            value={sportTag}
            onChange={(e) => setSportTag(e.target.value as SportTag)}
            className="h-10 px-3 rounded-lg bg-background border border-border text-sm capitalize"
          >
            {SPORT_TAGS.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            minLength={2}
            maxLength={200}
            placeholder="Goodlife Fitness Kanata"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scheduledAt">When</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="durationMins">Duration (min)</Label>
            <Input
              id="durationMins"
              type="number"
              value={durationMins}
              onChange={(e) =>
                setDurationMins(parseInt(e.target.value || "60", 10))
              }
              min={MIN_DURATION_MINS}
              max={MAX_DURATION_MINS}
              step={15}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capacity">Cap (optional)</Label>
            <Input
              id="capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min={MIN_CAPACITY}
              max={MAX_CAPACITY}
              placeholder="e.g. 4"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Notes (optional)</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Bring a spotter if you're going heavy."
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" data-testid="meetup-form-error">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="mt-2 gap-2">
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Posting…
            </>
          ) : (
            "Post meetup"
          )}
        </Button>
      </form>
    </div>
  );
}
