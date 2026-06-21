"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Dumbbell,
  Loader2,
  Ban,
  Flag,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/verified-badge";
import { useAuth } from "@/context/AuthContext";

interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface OtherUser {
  id: string;
  name: string;
  photoUrl: string | null;
  isVerified: boolean;
}

/** How often we re-poll for new messages while the chat is open (ms). */
const POLL_INTERVAL_MS = 5000;

/** Message count at which the "meet in a public gym" nudge appears. */
const NUDGE_THRESHOLD = 10;

const REPORT_REASONS = [
  "Inappropriate messages",
  "Harassment or hate speech",
  "Spam or fake profile",
  "Underage user",
  "Something else",
] as const;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const { authFetch, user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Safety surfaces.
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reporting, setReporting] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const firstMeetShownRef = useRef(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Read the per-match dismissal flag for the "meet in a public gym" nudge
  // so it doesn't reappear every load after the user has acknowledged it.
  // Synchronous setState here is intentional — it's the canonical pattern
  // for hydrating UI state from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined" || !matchId) return;
    const key = `gm_chat_nudge_${matchId}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.localStorage.getItem(key) === "1") setNudgeDismissed(true);
  }, [matchId]);

  const loadThread = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await authFetch(`/api/matches/${matchId}/messages`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMessages(data.messages ?? []);
        setBlocked(data.blocked ?? false);
        if (data.otherUser) setOtherUser(data.otherUser);

        // First-meet safety tip — shown once per match the first time the
        // chat is opened with no messages yet. Fire-and-forget toast; the
        // localStorage flag means a refresh doesn't re-trigger it.
        if (!silent && typeof window !== "undefined") {
          const safetyKey = `gm_chat_safety_${matchId}`;
          const alreadyShown = window.localStorage.getItem(safetyKey) === "1";
          if (
            !alreadyShown &&
            !firstMeetShownRef.current &&
            (data.messages ?? []).length === 0
          ) {
            firstMeetShownRef.current = true;
            window.localStorage.setItem(safetyKey, "1");
            import("sonner").then(({ toast }) => {
              toast("Safety tip", {
                description:
                  "For your first session, pick a busy gym hour and tell someone where you're going.",
                duration: 7000,
              });
            });
          }
        }
      } catch {
        // Keep whatever we already have on a transient failure; the next
        // poll will recover.
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authFetch, matchId]
  );

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadThread(false);
  }, [authLoading, user, loadThread]);

  useEffect(() => {
    if (authLoading || !user || notFound) return;
    const id = setInterval(() => loadThread(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [authLoading, user, notFound, loadThread]);

  useEffect(() => {
    if (authLoading || !user || notFound) return;
    authFetch("/api/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId }),
    }).catch(() => {
      // Best-effort.
    });
  }, [authLoading, user, notFound, authFetch, matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const content = draft.trim();
      if (!content || sending || blocked) return;
      setSending(true);
      try {
        const res = await authFetch(`/api/matches/${matchId}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (res.status === 403) {
          setBlocked(true);
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setDraft("");
      } catch {
        // Leave the draft in the box so the user can retry.
      } finally {
        setSending(false);
      }
    },
    [authFetch, matchId, draft, sending, blocked]
  );

  const dismissNudge = useCallback(() => {
    setNudgeDismissed(true);
    if (typeof window !== "undefined" && matchId) {
      window.localStorage.setItem(`gm_chat_nudge_${matchId}`, "1");
    }
  }, [matchId]);

  const submitReport = useCallback(async () => {
    if (!otherUser || reporting) return;
    setReporting(true);
    try {
      const res = await authFetch(`/api/users/${otherUser.id}/report`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: reportReason,
          context: { matchId },
        }),
      });
      const { toast } = await import("sonner");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Couldn't send the report");
        return;
      }
      setBlocked(true);
      setReportOpen(false);
      toast.success("Report sent. You won't see this user again.");
    } catch {
      const { toast } = await import("sonner");
      toast.error("Couldn't send the report — try again");
    } finally {
      setReporting(false);
    }
  }, [authFetch, matchId, otherUser, reportReason, reporting]);

  // ---- render --------------------------------------------------------
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          This conversation doesn&apos;t exist or you don&apos;t have access to
          it.
        </p>
        <Link
          href="/matches"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to matches
        </Link>
      </div>
    );
  }

  const showNudge =
    !blocked && !nudgeDismissed && messages.length >= NUDGE_THRESHOLD;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem-4rem)]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={() => router.push("/matches")}
          aria-label="Back to matches"
          className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
          {otherUser?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={otherUser.photoUrl}
              alt={otherUser.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Dumbbell size={16} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="font-semibold text-sm truncate">
            {otherUser?.name ?? "Chat"}
          </span>
          {otherUser?.isVerified && <VerifiedBadge size={13} />}
        </div>

        {/* Visible Report button — pulled out of any menu so the safety
            affordance is single-tap. Only shown once we know who the other
            user is, and hidden once the conversation is already blocked. */}
        {otherUser && !blocked && (
          <button
            onClick={() => setReportOpen(true)}
            aria-label="Report this user"
            data-testid="chat-report"
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0"
            title="Report this user"
          >
            <Flag size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-muted-foreground" size={20} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
            <p className="text-sm">
              You matched with {otherUser?.name ?? "this lifter"}.
            </p>
            <p className="text-xs mt-1">
              Break the ice — ask when they&apos;re training next.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[78%] ${
                  mine ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-2xl text-sm break-words ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {timeLabel(m.createdAt)}
                </span>
              </div>
            );
          })
        )}

        {/* "Meet in public" nudge — kicks in once the chat is long enough
            that planning a real-world session is plausible. Dismissible per
            match so it doesn't nag the same pair every load. */}
        {showNudge && (
          <div
            data-testid="public-meet-nudge"
            className="self-center my-2 max-w-[90%] rounded-2xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 flex items-start gap-2.5"
          >
            <ShieldCheck
              size={16}
              className="text-sky-400 shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sky-300">
                Planning to meet?
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Pick a public gym at a busy hour for your first session — it&apos;s
                safer for both of you.
              </p>
            </div>
            <button
              onClick={dismissNudge}
              aria-label="Dismiss safety tip"
              className="w-6 h-6 rounded-full hover:bg-sky-500/20 flex items-center justify-center text-sky-300 shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {blocked ? (
        <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-border shrink-0 text-muted-foreground">
          <Ban size={15} />
          <span className="text-sm">
            You can no longer message this user.
          </span>
        </div>
      ) : (
        <form
          onSubmit={sendMessage}
          className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            maxLength={1000}
            className="flex-1 h-10 px-3 rounded-full bg-secondary text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
          >
            {sending ? (
              <Loader2 className="animate-spin text-primary-foreground" size={16} />
            ) : (
              <Send size={16} className="text-primary-foreground" />
            )}
          </button>
        </form>
      )}

      {/* Report dialog. Reasons stay aligned with the Match deck report flow
          so moderators see a consistent label vocabulary. The server treats
          a report as also blocking, so we don't need a separate Block
          button on this surface. */}
      <Dialog
        open={reportOpen}
        onOpenChange={(open) => !open && setReportOpen(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Report {otherUser?.name ?? "user"}</DialogTitle>
            <DialogDescription>
              Reports are reviewed by our team. This user will also be blocked
              and won&apos;t appear in your matches again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 my-3">
            {REPORT_REASONS.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  reportReason === r
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="chat-report-reason"
                  value={r}
                  checked={reportReason === r}
                  onChange={() => setReportReason(r)}
                  className="accent-primary"
                />
                <span className="text-sm">{r}</span>
              </label>
            ))}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              disabled={reporting}
              onClick={submitReport}
            >
              {reporting ? "Reporting…" : "Submit report"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setReportOpen(false)}
              disabled={reporting}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
