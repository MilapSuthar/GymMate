"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, X, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Suspense } from "react";

interface Booking {
  id: string;
  scheduledAt: string;
  durationMins: number | null;
  notes: string | null;
  status: string;
  paidAmount: number;
  paid: boolean;
  client: { id: string; name: string; photoUrl: string | null };
}

const TABS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  confirmed: "bg-emerald-500/10 text-emerald-600",
  completed: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BookingsContent() {
  const searchParams = useSearchParams();
  const { authFetch, loading: authLoading, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("status") || "");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeTab ? `?status=${activeTab}` : "";
      const res = await authFetch(`/api/trainer/bookings${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBookings(data.bookings ?? []);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [authFetch, activeTab]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchBookings();
  }, [authLoading, user, fetchBookings]);

  const updateStatus = async (bookingId: string, status: string) => {
    setUpdating(bookingId);
    try {
      const res = await authFetch(`/api/trainer/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Update failed");
      }
      toast.success(`Booking ${status}`);
      await fetchBookings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-1">Bookings</h1>
      <p className="text-muted-foreground text-sm mb-4">Manage your session requests</p>

      {/* Tab filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-4 h-[110px] animate-pulse"
            />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No bookings found.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-card border border-border rounded-2xl p-4">
              {/* Header */}
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {b.client.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{b.client.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(b.scheduledAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">£{b.paidAmount}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                      STATUS_STYLES[b.status] ?? "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="text-xs text-muted-foreground mb-2 flex gap-3">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {b.durationMins ?? 60} min
                </span>
                {b.paid && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={11} />
                    Paid
                  </span>
                )}
              </div>

              {b.notes && (
                <p className="text-xs text-muted-foreground italic mb-3 line-clamp-2">
                  &ldquo;{b.notes}&rdquo;
                </p>
              )}

              {/* Actions */}
              {b.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={updating === b.id}
                    onClick={() => updateStatus(b.id, "confirmed")}
                  >
                    <Check size={13} />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={updating === b.id}
                    onClick={() => updateStatus(b.id, "cancelled")}
                  >
                    <X size={13} />
                    Decline
                  </Button>
                </div>
              )}

              {b.status === "confirmed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1"
                  disabled={updating === b.id}
                  onClick={() => updateStatus(b.id, "completed")}
                >
                  <CheckCircle2 size={13} />
                  Mark as Completed
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrainerBookingsPage() {
  return (
    <Suspense>
      <BookingsContent />
    </Suspense>
  );
}
