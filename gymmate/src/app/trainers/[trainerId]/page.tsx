"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  MapPin,
  CheckCircle,
  Calendar,
  Clock,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Trainer {
  id: string;
  name: string;
  photoUrl: string | null;
  gym: string | null;
  specialty: string;
  bio: string | null;
  pricePerSession: number;
  certifications: string | null;
  tags: string[];
  verified: boolean;
  rating: number | null;
  reviewCount: number;
}

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
];

export default function TrainerProfilePage() {
  const { trainerId } = useParams<{ trainerId: string }>();
  const router = useRouter();
  const { authFetch, loading: authLoading, user } = useAuth();

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    date: "",
    time: "10:00",
    durationMins: 60,
    notes: "",
  });

  const fetchTrainer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/trainers/${trainerId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTrainer(data.trainer);
    } catch {
      toast.error("Failed to load trainer");
    } finally {
      setLoading(false);
    }
  }, [authFetch, trainerId]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchTrainer();
  }, [authLoading, user, fetchTrainer]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) {
      toast.error("Please pick a date");
      return;
    }
    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();

      // Create booking first
      const bookRes = await authFetch(`/api/trainers/${trainerId}/book`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scheduledAt,
          durationMins: form.durationMins,
          notes: form.notes || undefined,
        }),
      });
      if (!bookRes.ok) throw new Error("Failed to create booking");
      const { booking } = await bookRes.json();

      // Request Stripe Checkout session
      const checkoutRes = await authFetch(`/api/trainers/${trainerId}/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (!checkoutRes.ok) {
        const d = await checkoutRes.json().catch(() => ({}));
        // If Stripe not configured, still show success for the booking
        if (checkoutRes.status === 503) {
          toast.success("Session booked! (Payment not configured)");
          setShowBooking(false);
          return;
        }
        throw new Error(d.error || "Checkout failed");
      }

      const { url } = await checkoutRes.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="h-6 w-20 bg-muted rounded animate-pulse mb-4" />
        <div className="h-40 bg-card border border-border rounded-2xl animate-pulse mb-4" />
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="px-4 pt-6 text-center text-muted-foreground py-16">
        Trainer not found.
      </div>
    );
  }

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <div className="px-4 pt-6 pb-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-2xl font-bold text-muted-foreground shrink-0">
            {trainer.photoUrl ? (
              <img
                src={trainer.photoUrl}
                alt={trainer.name}
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              trainer.name.charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-lg font-bold">{trainer.name}</h1>
              {trainer.verified && (
                <CheckCircle size={16} className="text-primary shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{trainer.specialty}</p>
            {trainer.gym && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin size={11} />
                {trainer.gym}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold">£{trainer.pricePerSession}</p>
            <p className="text-xs text-muted-foreground">/session</p>
          </div>
        </div>

        {trainer.rating !== null && (
          <div className="flex items-center gap-1 mb-3">
            <Star size={14} className="text-primary fill-primary" />
            <span className="text-sm font-medium">{trainer.rating}</span>
            <span className="text-xs text-muted-foreground">
              ({trainer.reviewCount} reviews)
            </span>
          </div>
        )}

        {trainer.bio && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {trainer.bio}
          </p>
        )}

        {trainer.certifications && (
          <p className="text-xs text-muted-foreground mb-3">
            <span className="font-medium text-foreground">Certifications: </span>
            {trainer.certifications}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {trainer.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <Button
        className="w-full mb-4 gap-2"
        onClick={() => setShowBooking(true)}
      >
        <Calendar size={16} />
        Book a Session
      </Button>

      {/* Booking bottom sheet */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowBooking(false)}
          />
          <div className="relative bg-card border border-border rounded-t-2xl w-full p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold mb-4">Book a session</h2>

            <form onSubmit={handleBook} className="flex flex-col gap-4">
              {/* Date */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block">
                  <Calendar size={12} />
                  Date *
                </label>
                <Input
                  type="date"
                  min={minDate}
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>

              {/* Time */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block">
                  <Clock size={12} />
                  Time *
                </label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Duration
                </label>
                <div className="flex gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, durationMins: d.value }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                        form.durationMins === d.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Notes (optional)
                </label>
                <Input
                  placeholder="Goals, injuries, anything the trainer should know…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>

              {/* Summary */}
              <div className="bg-secondary rounded-xl p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{form.durationMins} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">£{trainer.pricePerSession}</span>
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="gap-2">
                <CreditCard size={15} />
                {submitting ? "Processing…" : "Confirm & Pay"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
