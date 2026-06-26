"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Dumbbell,
  MapPin,
  Loader2,
  Briefcase,
  ChevronRight,
  LogOut,
  Download,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ProfileSessions from "@/components/profile-sessions";
import VerifiedBadge from "@/components/verified-badge";
import { useAuth } from "@/context/AuthContext";

interface Profile {
  id: string;
  name: string;
  displayName: string | null;
  bio: string | null;
  age: number | null;
  gymName: string | null;
  fitnessGoals: string[];
  experienceLevel: string | null;
  photos: { id: string; url: string; position: number }[];
  isVerified: boolean;
  email?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { authFetch, logout, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fetching, setFetching] = useState(true);

  // Account-management dialog state.
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await authFetch("/api/account/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gymmate-${profile?.id ?? "export"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const { toast } = await import("sonner");
      toast.success("Your data is downloading");
    } catch {
      const { toast } = await import("sonner");
      toast.error("Couldn't export your data — try again");
    } finally {
      setExporting(false);
    }
  };

  const submitDelete = async () => {
    if (deleting || deleteConfirm !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await authFetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password: deletePassword || undefined,
          confirm: "DELETE",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error || "Couldn't delete your account");
        return;
      }
      router.replace("/login");
    } catch {
      setDeleteError("Network error — try again");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    (async () => {
      try {
        const res = await authFetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
        }
      } finally {
        setFetching(false);
      }
    })();
  }, [authFetch, loading]);

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return <div className="px-4 pt-6 text-muted-foreground">Could not load profile.</div>;
  }

  const cover = profile.photos[0]?.url;

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-sm">How others see you</p>
        </div>
        <Link
          href="/profile/edit"
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[12px] text-[0.8rem] font-medium border border-border bg-background hover:bg-muted transition-colors"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="relative aspect-[4/5] bg-gradient-to-b from-violet-900 to-indigo-900">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
                <Dumbbell size={48} className="text-white/40" />
              </div>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
            <h2 className="text-xl font-bold text-white flex items-center gap-1.5">
              <span>
                {profile.displayName || profile.name}
                {profile.age ? <span className="font-normal">, {profile.age}</span> : null}
              </span>
              {profile.isVerified && <VerifiedBadge size={15} />}
            </h2>
            {profile.gymName && (
              <div className="flex items-center gap-1 text-white/70 text-sm mt-0.5">
                <MapPin size={13} />
                <span>{profile.gymName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {profile.bio ? (
        <section className="mt-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">About</h3>
          <p className="text-sm leading-relaxed">{profile.bio}</p>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground mt-5 italic">
          No bio yet. <Link href="/profile/edit" className="text-primary underline">Add one</Link>.
        </p>
      )}

      {profile.experienceLevel && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Experience
          </h3>
          <Badge variant="secondary" className="capitalize">{profile.experienceLevel}</Badge>
        </section>
      )}

      {profile.fitnessGoals.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Goals</h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.fitnessGoals.map((g) => (
              <Badge key={g} variant="secondary" className="capitalize">{g.replace("-", " ")}</Badge>
            ))}
          </div>
        </section>
      )}

      {profile.photos.length > 1 && (
        <section className="mt-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Photos ({profile.photos.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {profile.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.url}
                alt=""
                className="aspect-square w-full object-cover rounded-xl border border-border"
              />
            ))}
          </div>
        </section>
      )}

      {/* Trust ribbon. Selfie-match verification ships in V1.2; until then,
          this section explains the badge and provides a placeholder CTA so
          the mechanic is discoverable from day one. Verified users get a
          subtler confirmation pill instead of the CTA. */}
      <section className="mt-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Trust
        </h3>
        {profile.isVerified ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
            <VerifiedBadge size={20} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sky-300">
                Verified profile
              </p>
              <p className="text-xs text-muted-foreground">
                Your selfie matched your photos. Other lifters can trust this
                profile is really you.
              </p>
            </div>
          </div>
        ) : (
          <button
            disabled
            title="Coming in V1.2"
            className="w-full flex items-center gap-3 rounded-xl p-3 border border-border bg-card text-left opacity-70 cursor-not-allowed"
          >
            <div className="w-9 h-9 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
              <VerifiedBadge size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Verify your profile</p>
              <p className="text-xs text-muted-foreground">
                A quick selfie check unlocks the blue badge on every screen.
                Coming next release.
              </p>
            </div>
          </button>
        )}
      </section>

      {/* V1 fitness pillar: weekly co-attendance + check-in surface. */}
      <ProfileSessions />

      {/* Coaching entry point. This is the ONLY discoverable route into the
          trainer flow — /trainer/dashboard self-redirects to /become-trainer
          for users who don't have a trainer profile yet, so a single link
          serves both new and existing trainers. */}
      <section className="mt-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Coaching
        </h3>
        <Link
          href="/trainer/dashboard"
          className="flex items-center gap-3 rounded-xl p-3 border border-border bg-card hover:border-primary/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Briefcase size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Train clients on GymMate</p>
            <p className="text-xs text-muted-foreground">
              Offer paid sessions or manage your bookings
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
        </Link>
      </section>

      {/* Account management — GDPR/CCPA "right to access" + "right to
          erasure." Export streams a JSON dump; delete is gated by password
          (for credentials accounts) and a typed "DELETE" confirmation. */}
      <section className="mt-8 pt-6 border-t border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Account
        </h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={exportData}
            disabled={exporting}
            data-testid="account-export"
            className="flex items-center gap-3 rounded-xl p-3 border border-border bg-card hover:border-primary/40 transition-colors disabled:opacity-50 text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {exporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Export my data</p>
              <p className="text-xs text-muted-foreground">
                Download a JSON file with everything on your account
              </p>
            </div>
          </button>

          <button
            onClick={() => setDeleteOpen(true)}
            data-testid="account-delete-open"
            className="flex items-center gap-3 rounded-xl p-3 border border-destructive/30 bg-destructive/5 hover:border-destructive/60 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
              <Trash2 size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">
                Delete my account
              </p>
              <p className="text-xs text-muted-foreground">
                Permanently removes your profile, matches, and messages
              </p>
            </div>
          </button>
        </div>

        <Button
          variant="destructive"
          onClick={() => logout()}
          data-testid="profile-logout"
          className="w-full h-10 gap-2 mt-4"
        >
          <LogOut size={16} />
          Log out
        </Button>
      </section>

      {/* Delete confirmation dialog. Requires both a password (for credentials
          accounts; OAuth-only accounts can leave it blank) AND a typed
          "DELETE" string to prevent any accidental nuclear button. */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteOpen(false);
            setDeletePassword("");
            setDeleteConfirm("");
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your profile, photos, matches,
              messages, meetups, and RSVPs. It cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 my-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="delete-password">
                Password{" "}
                <span className="text-muted-foreground font-normal">
                  (skip if you signed up with Google)
                </span>
              </Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="delete-confirm">
                Type{" "}
                <span className="font-mono font-semibold text-destructive">
                  DELETE
                </span>{" "}
                to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-destructive">{deleteError}</p>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              onClick={submitDelete}
              disabled={deleting || deleteConfirm !== "DELETE"}
              data-testid="account-delete-confirm"
            >
              {deleting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1" />
                  Deleting…
                </>
              ) : (
                "Permanently delete my account"
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
