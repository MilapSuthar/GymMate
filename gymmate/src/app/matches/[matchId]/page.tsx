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
import { ArrowLeft, Send, Dumbbell, Loader2, Ban } from "lucide-react";
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
}

/** How often we re-poll for new messages while the chat is open (ms). */
const POLL_INTERVAL_MS = 5000;

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

  const bottomRef = useRef<HTMLDivElement | null>(null);

  /**
   * Fetch the thread. `silent` skips the loading spinner — used by the poll
   * loop so the screen doesn't flash every 5 seconds.
   */
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
      } catch {
        // Keep whatever we already have on a transient failure; the next
        // poll will recover. Only the very first load surfaces an error,
        // and that path is the 404 handled above.
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authFetch, matchId]
  );

  // Initial load.
  useEffect(() => {
    if (authLoading || !user) return;
    // Canonical fetch-on-mount; the React 19 rule flags the indirect setState
    // inside loadThread. Intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadThread(false);
  }, [authLoading, user, loadThread]);

  // Poll for new messages while the chat is open.
  useEffect(() => {
    if (authLoading || !user || notFound) return;
    const id = setInterval(() => loadThread(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [authLoading, user, notFound, loadThread]);

  // Clear any unread notifications tied to this conversation as soon as the
  // chat opens — whether the user arrived via the notification, the matches
  // list, or the top-bar icon, the badges for these messages are now stale.
  // Fire-and-forget: no setState here, so it doesn't trip the effect rule.
  useEffect(() => {
    if (authLoading || !user || notFound) return;
    authFetch("/api/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId }),
    }).catch(() => {
      // Best-effort; the notifications page re-syncs on its next load.
    });
  }, [authLoading, user, notFound, authFetch, matchId]);

  // Auto-scroll to the newest message. This is a DOM side-effect (not a
  // setState), so it's a legitimate use of useEffect.
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
          // A block was created since the thread loaded — reflect it.
          setBlocked(true);
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        // Append the server's canonical message (has the real id + timestamp).
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

  return (
    <div className="flex flex-col h-[calc(100vh-3rem-4rem)]">
      {/* Header */}
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
        <span className="font-semibold text-sm truncate">
          {otherUser?.name ?? "Chat"}
        </span>
      </div>

      {/* Message list */}
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
        <div ref={bottomRef} />
      </div>

      {/* Composer — replaced by a notice when the conversation is blocked. */}
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
    </div>
  );
}
