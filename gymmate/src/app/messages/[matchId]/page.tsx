"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  fromMe: boolean;
}

interface OtherUser {
  id: string;
  name: string;
  photoUrl: string | null;
}

export default function ChatPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const { user, accessToken, authFetch, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [other, setOther] = useState<OtherUser | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch the match meta (other user info) from /api/matches once. We only
  // need this for the header — message content comes from /api/messages.
  const fetchMeta = useCallback(async () => {
    const res = await authFetch("/api/matches");
    if (!res.ok) return;
    const data = await res.json();
    const match = data.matches?.find((m: { id: string }) => m.id === matchId);
    if (match) setOther(match.otherUser);
  }, [authFetch, matchId]);

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/messages/${matchId}`);
      if (res.status === 403) {
        setError("You don't have access to this conversation");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      setMessages(data.messages || []);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [authFetch, matchId]);

  // Mark as read when the chat is opened. Fire-and-forget — failure to mark
  // read shouldn't block the UI.
  const markRead = useCallback(async () => {
    try {
      await authFetch(`/api/messages/${matchId}/read`, { method: "POST" });
    } catch {
      /* ignore */
    }
  }, [authFetch, matchId]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchInitial();
    fetchMeta();
    markRead();
  }, [authLoading, user, fetchInitial, fetchMeta, markRead]);

  // Keep view scrolled to bottom whenever a new message arrives — but not
  // when paginating older messages (which keeps the user's read position).
  const stickToBottomRef = useRef(true);
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Real-time subscription via SSE. Token query-string auth is required
  // because EventSource can't set headers.
  useEffect(() => {
    if (!accessToken || !matchId) return;
    const es = new EventSource(
      `/api/messages/${matchId}/stream?token=${encodeURIComponent(accessToken)}`
    );
    es.onmessage = (ev) => {
      try {
        const evt = JSON.parse(ev.data);
        if (evt.type === "message" && evt.message) {
          setMessages((prev) => {
            // Skip duplicates: the sender already has this row from the POST
            // response, and the SSE broadcast hits all subscribers including
            // the sender's own connection.
            if (prev.some((m) => m.id === evt.message.id)) return prev;
            const fromMe = evt.message.senderId === user?.id;
            return [...prev, { ...evt.message, fromMe }];
          });
          // If the new message is from the other user and we're focused, mark read
          if (evt.message.senderId !== user?.id && document.visibilityState === "visible") {
            markRead();
          }
        } else if (evt.type === "read" && evt.readerId !== user?.id) {
          // Other user just read our messages — update receipts
          setMessages((prev) =>
            prev.map((m) =>
              m.fromMe && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m
            )
          );
        }
      } catch {
        /* ignore malformed events */
      }
    };
    return () => es.close();
  }, [accessToken, matchId, user?.id, markRead]);

  // Pagination: when the top sentinel is visible, load the next older page.
  useEffect(() => {
    if (!nextCursor || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const scroll = scrollRef.current;
    if (!scroll) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || loadingOlder) return;
        setLoadingOlder(true);
        stickToBottomRef.current = false;
        const prevHeight = scroll.scrollHeight;
        try {
          const res = await authFetch(
            `/api/messages/${matchId}?before=${encodeURIComponent(nextCursor)}`
          );
          if (res.ok) {
            const data = await res.json();
            setMessages((prev) => [...data.messages, ...prev]);
            setNextCursor(data.nextCursor);
            // Preserve scroll position after prepending older messages
            requestAnimationFrame(() => {
              if (scroll) scroll.scrollTop = scroll.scrollHeight - prevHeight;
            });
          }
        } finally {
          setLoadingOlder(false);
          stickToBottomRef.current = true;
        }
      },
      { root: scroll, rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, loadingOlder, authFetch, matchId]);

  const send = useCallback(async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await authFetch(`/api/messages/${matchId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        // Restore the draft so the user doesn't lose their text
        setDraft(content);
        return;
      }
      const data = await res.json();
      setMessages((prev) =>
        prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
      );
    } catch {
      setDraft(content);
    } finally {
      setSending(false);
    }
  }, [authFetch, draft, matchId, sending]);

  const grouped = useMemo(() => groupByDay(messages), [messages]);

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)]">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="p-1 -ml-1 rounded-md hover:bg-secondary"
        >
          <ArrowLeft size={20} />
        </Link>
        {other ? (
          <>
            {other.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={other.photoUrl}
                alt={other.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                {other.name.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <p className="font-semibold text-sm" data-testid="chat-header-name">
              {other.name}
            </p>
          </>
        ) : (
          <div className="h-8 w-32 bg-secondary rounded animate-pulse" />
        )}
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
        data-testid="chat-scroll"
      >
        {nextCursor && <div ref={sentinelRef} className="h-1" />}
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        )}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p
            data-testid="chat-error"
            className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground mt-8">
            No messages yet. Say hi 👋
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.label} className="flex flex-col gap-1.5">
              <div className="text-center text-[10px] uppercase tracking-wider text-muted-foreground my-1">
                {group.label}
              </div>
              {group.messages.map((m) => (
                <Bubble key={m.id} message={m} />
              ))}
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-border bg-background p-3 flex items-center gap-2 sticky bottom-0"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message"
          disabled={!!error}
          data-testid="chat-input"
          className="flex-1 h-10 px-4 rounded-full bg-secondary text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending || !!error}
          aria-label="Send"
          data-testid="chat-send"
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  return (
    <div
      data-testid="chat-message"
      data-from-me={message.fromMe}
      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm break-words ${
        message.fromMe
          ? "self-end bg-primary text-primary-foreground rounded-br-md"
          : "self-start bg-secondary rounded-bl-md"
      }`}
    >
      {message.content}
    </div>
  );
}

interface MessageGroup {
  label: string;
  messages: ChatMessage[];
}

function groupByDay(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const m of messages) {
    const label = dayLabel(new Date(m.createdAt));
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.messages.push(m);
    else groups.push({ label, messages: [m] });
  }
  return groups;
}

function dayLabel(d: Date): string {
  const now = new Date();
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.floor((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
