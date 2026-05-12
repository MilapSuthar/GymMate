"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Star,
  CalendarCheck,
  Clock,
  DollarSign,
  ChevronRight,
  UserCheck,
  Edit3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface TrainerProfile {
  id: string;
  name: string;
  specialty: string;
  pricePerSession: number;
  rating: number | null;
  reviewCount: number;
  verified: boolean;
  tags: string[];
  gym: string | null;
}

interface Booking {
  id: string;
  scheduledAt: string;
  durationMins: number | null;
  status: string;
  paidAmount: number;
  paid: boolean;
  client: { id: string; name: string; photoUrl: string | null };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrainerDashboardPage() {
  const router = useRouter();
  const { authFetch, loading: authLoading, user } = useAuth();
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, bookingsRes] = await Promise.all([
        authFetch("/api/trainer/profile"),
        authFetch("/api/trainer/bookings"),
      ]);

      if (profileRes.status === 404) {
        router.replace("/become-trainer");
        return;
      }
      if (!profileRes.ok) throw new Error();

      const [profileData, bookingsData] = await Promise.all([
        profileRes.json(),
        bookingsRes.ok ? bookingsRes.json() : Promise.resolve({ bookings: [] }),
      ]);

      setProfile(profileData.trainer);
      setBookings(bookingsData.bookings ?? []);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [authFetch, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();
  }, [authLoading, user, fetchData]);

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
        <div className="h-28 bg-card border border-border rounded-2xl animate-pulse mb-4" />
        <div className="h-40 bg-card border border-border rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!profile) return null;

  const earnings = bookings
    .filter((b) => b.paid)
    .reduce((sum, b) => sum + b.paidAmount, 0);

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const upcomingConfirmed = bookings
    .filter((b) => b.status === "confirmed" && new Date(b.scheduledAt) > new Date())
    .slice(0, 5);

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Trainer Portal</h1>
          <p className="text-muted-foreground text-sm">Welcome back, {profile.name.split(" ")[0]}</p>
        </div>
        <Link href="/trainer/profile">
          <Button size="sm" variant="outline" className="gap-1">
            <Edit3 size={13} />
            Edit
          </Button>
        </Link>
      </div>

      {/* Profile summary */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
            {profile.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{profile.name}</span>
              {profile.verified && <UserCheck size={14} className="text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">{profile.specialty}</p>
            {profile.gym && (
              <p className="text-xs text-muted-foreground">{profile.gym}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">£{profile.pricePerSession}</p>
            <p className="text-xs text-muted-foreground">/session</p>
          </div>
        </div>

        {profile.rating !== null && (
          <div className="flex items-center gap-1 mt-2">
            <Star size={12} className="text-primary fill-primary" />
            <span className="text-xs font-medium">{profile.rating}</span>
            <span className="text-xs text-muted-foreground">({profile.reviewCount} reviews)</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2">
          {profile.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <DollarSign size={16} className="text-primary mx-auto mb-1" />
          <p className="text-base font-bold">£{earnings.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Earned</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Clock size={16} className="text-amber-500 mx-auto mb-1" />
          <p className="text-base font-bold">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <CalendarCheck size={16} className="text-emerald-500 mx-auto mb-1" />
          <p className="text-base font-bold">{upcomingConfirmed.length}</p>
          <p className="text-xs text-muted-foreground">Confirmed</p>
        </div>
      </div>

      {/* Pending CTA */}
      {pendingCount > 0 && (
        <Link href="/trainer/bookings?status=pending">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-amber-600">
              {pendingCount} pending booking{pendingCount > 1 ? "s" : ""} awaiting response
            </p>
            <ChevronRight size={16} className="text-amber-600" />
          </div>
        </Link>
      )}

      {/* Upcoming sessions */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Upcoming Sessions</h2>
        <Link href="/trainer/bookings" className="text-xs text-primary">
          View all
        </Link>
      </div>

      {upcomingConfirmed.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No confirmed sessions yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {upcomingConfirmed.map((b) => (
            <div
              key={b.id}
              className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                {b.client.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{b.client.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(b.scheduledAt)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium">
                  {b.durationMins ?? 60} min
                </p>
                <p className="text-xs text-muted-foreground">£{b.paidAmount}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
