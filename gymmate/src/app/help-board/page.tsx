"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, ThumbsUp, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Author {
  id: string;
  name: string;
  photoUrl: string | null;
}

interface Question {
  id: string;
  title: string;
  body: string;
  tags: string[];
  likeCount: number;
  answerCount: number;
  likedByMe: boolean;
  author: Author;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 172800) return "Yesterday";
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function HelpBoardPage() {
  const { authFetch, loading: authLoading, user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [askOpen, setAskOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", tags: "" });

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/help-board");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestions(data.questions);
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchQuestions();
  }, [authLoading, user, fetchQuestions]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5);
      const res = await authFetch("/api/help-board", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          tags,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestions((prev) => [data.question, ...prev]);
      setAskOpen(false);
      setForm({ title: "", content: "", tags: "" });
      toast.success("Question posted!");
    } catch {
      toast.error("Failed to post question");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (q: Question) => {
    const snapshot = { likedByMe: q.likedByMe, likeCount: q.likeCount };
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === q.id
          ? {
              ...item,
              likedByMe: !item.likedByMe,
              likeCount: item.likedByMe
                ? item.likeCount - 1
                : item.likeCount + 1,
            }
          : item
      )
    );
    try {
      const res = await authFetch(`/api/help-board/${q.id}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id
            ? { ...item, likedByMe: data.liked, likeCount: data.likeCount }
            : item
        )
      );
    } catch {
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id ? { ...item, ...snapshot } : item
        )
      );
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Help Board</h1>
        <Button size="sm" className="gap-1.5" onClick={() => setAskOpen(true)}>
          <Plus size={15} />
          Ask
        </Button>
      </div>
      <p className="text-muted-foreground text-sm mb-5">
        Questions from your gym community
      </p>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-4 h-28 animate-pulse"
            />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No questions yet. Be the first to ask!
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Avatar size="sm">
                  {q.author.photoUrl && (
                    <AvatarImage
                      src={q.author.photoUrl}
                      alt={q.author.name}
                    />
                  )}
                  <AvatarFallback>
                    {q.author.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium flex-1">
                  {q.author.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(q.createdAt)}
                </span>
              </div>

              <Link href={`/help-board/${q.id}`} className="block mb-3">
                <p className="text-sm font-semibold leading-snug mb-1 hover:underline">
                  {q.title}
                </p>
                <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                  {q.body}
                </p>
              </Link>

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                  {q.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0 ml-2">
                  <button
                    onClick={() => toggleLike(q)}
                    className={`flex items-center gap-1 transition-colors ${
                      q.likedByMe
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ThumbsUp
                      size={13}
                      fill={q.likedByMe ? "currentColor" : "none"}
                    />
                    {q.likeCount}
                  </button>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MessageCircle size={13} />
                    {q.answerCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={askOpen} onOpenChange={(open) => setAskOpen(open)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ask a question</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAsk} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ask-title">Title</Label>
              <Input
                id="ask-title"
                placeholder="Short, specific question title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                maxLength={200}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ask-content">Details</Label>
              <Textarea
                id="ask-content"
                placeholder="Add more context or details…"
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                rows={4}
                maxLength={5000}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ask-tags">
                Tags{" "}
                <span className="text-muted-foreground font-normal">
                  (optional, comma-separated)
                </span>
              </Label>
              <Input
                id="ask-tags"
                placeholder="e.g. Beginners, Deadlift, Form"
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
              />
            </div>
            <Button
              type="submit"
              disabled={
                submitting || !form.title.trim() || !form.content.trim()
              }
              className="mt-1"
            >
              {submitting ? "Posting…" : "Post question"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
