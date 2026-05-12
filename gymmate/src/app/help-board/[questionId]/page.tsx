"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ThumbsUp, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Author {
  id: string;
  name: string;
  photoUrl: string | null;
}

interface Answer {
  id: string;
  body: string;
  likeCount: number;
  likedByMe: boolean;
  author: Author;
  createdAt: string;
}

interface Question {
  id: string;
  title: string;
  body: string;
  tags: string[];
  likeCount: number;
  likedByMe: boolean;
  author: Author;
  createdAt: string;
  answers: Answer[];
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 172800) return "Yesterday";
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function QuestionPage() {
  const { questionId } = useParams<{ questionId: string }>();
  const router = useRouter();
  const { authFetch, loading: authLoading, user } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/help-board/${questionId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestion(data.question);
    } catch {
      toast.error("Failed to load question");
    } finally {
      setLoading(false);
    }
  }, [authFetch, questionId]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchQuestion();
  }, [authLoading, user, fetchQuestion]);

  const toggleQuestionLike = async () => {
    if (!question) return;
    const snapshot = { likedByMe: question.likedByMe, likeCount: question.likeCount };
    setQuestion((q) =>
      q
        ? {
            ...q,
            likedByMe: !q.likedByMe,
            likeCount: q.likedByMe ? q.likeCount - 1 : q.likeCount + 1,
          }
        : q
    );
    try {
      const res = await authFetch(`/api/help-board/${question.id}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestion((q) =>
        q ? { ...q, likedByMe: data.liked, likeCount: data.likeCount } : q
      );
    } catch {
      setQuestion((q) => (q ? { ...q, ...snapshot } : q));
    }
  };

  const toggleAnswerLike = async (answer: Answer) => {
    if (!question) return;
    const snapshot = { likedByMe: answer.likedByMe, likeCount: answer.likeCount };
    setQuestion((q) =>
      q
        ? {
            ...q,
            answers: q.answers.map((a) =>
              a.id === answer.id
                ? {
                    ...a,
                    likedByMe: !a.likedByMe,
                    likeCount: a.likedByMe ? a.likeCount - 1 : a.likeCount + 1,
                  }
                : a
            ),
          }
        : q
    );
    try {
      const res = await authFetch(
        `/api/help-board/answers/${answer.id}/like`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestion((q) =>
        q
          ? {
              ...q,
              answers: q.answers.map((a) =>
                a.id === answer.id
                  ? { ...a, likedByMe: data.liked, likeCount: data.likeCount }
                  : a
              ),
            }
          : q
      );
    } catch {
      setQuestion((q) =>
        q
          ? {
              ...q,
              answers: q.answers.map((a) =>
                a.id === answer.id ? { ...a, ...snapshot } : a
              ),
            }
          : q
      );
    }
  };

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || !question) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/help-board/${question.id}/answers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: answerText.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestion((q) =>
        q ? { ...q, answers: [...q.answers, data.answer] } : q
      );
      setAnswerText("");
      toast.success("Answer posted!");
    } catch {
      toast.error("Failed to post answer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="h-6 w-20 bg-muted rounded animate-pulse mb-4" />
        <div className="h-44 bg-card border border-border rounded-2xl animate-pulse mb-4" />
        <div className="h-24 bg-card border border-border rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="px-4 pt-6 pb-4 text-center text-muted-foreground py-16">
        Question not found.
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Question card */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Avatar size="sm">
            {question.author.photoUrl && (
              <AvatarImage
                src={question.author.photoUrl}
                alt={question.author.name}
              />
            )}
            <AvatarFallback>
              {question.author.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium flex-1">{question.author.name}</span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(question.createdAt)}
          </span>
        </div>

        <h1 className="text-base font-semibold mb-2">{question.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {question.body}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {question.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <button
            onClick={toggleQuestionLike}
            className={`flex items-center gap-1 text-xs shrink-0 ml-2 transition-colors ${
              question.likedByMe
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ThumbsUp
              size={13}
              fill={question.likedByMe ? "currentColor" : "none"}
            />
            {question.likeCount}
          </button>
        </div>
      </div>

      {/* Answers section */}
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-muted-foreground">
        <MessageCircle size={14} />
        {question.answers.length}{" "}
        {question.answers.length === 1 ? "Answer" : "Answers"}
      </h2>

      {question.answers.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {question.answers.map((a) => (
            <div
              key={a.id}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Avatar size="sm">
                  {a.author.photoUrl && (
                    <AvatarImage
                      src={a.author.photoUrl}
                      alt={a.author.name}
                    />
                  )}
                  <AvatarFallback>
                    {a.author.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium flex-1">{a.author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(a.createdAt)}
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-2">{a.body}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => toggleAnswerLike(a)}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    a.likedByMe
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ThumbsUp
                    size={13}
                    fill={a.likedByMe ? "currentColor" : "none"}
                  />
                  {a.likeCount}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post answer */}
      <form onSubmit={submitAnswer} className="flex flex-col gap-2">
        <Textarea
          placeholder="Write your answer…"
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          rows={3}
          maxLength={5000}
        />
        <Button
          type="submit"
          disabled={submitting || !answerText.trim()}
          className="self-end"
        >
          {submitting ? "Posting…" : "Post answer"}
        </Button>
      </form>
    </div>
  );
}
