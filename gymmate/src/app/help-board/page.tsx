import { MessageCircle, ThumbsUp, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const questions = [
  {
    id: 1,
    author: "Alex M.",
    time: "2h ago",
    question: "What's the best rep range for building muscle as a beginner?",
    tags: ["Beginners", "Hypertrophy"],
    likes: 14,
    replies: 6,
  },
  {
    id: 2,
    author: "Priya S.",
    time: "4h ago",
    question: "Is it okay to do cardio on the same day as leg day?",
    tags: ["Cardio", "Legs", "Recovery"],
    likes: 9,
    replies: 11,
  },
  {
    id: 3,
    author: "Tom W.",
    time: "Yesterday",
    question: "My lower back hurts during deadlifts — what am I doing wrong?",
    tags: ["Form", "Deadlift", "Injury"],
    likes: 22,
    replies: 15,
  },
  {
    id: 4,
    author: "Dana L.",
    time: "Yesterday",
    question: "How much protein do I actually need per day if I train 4x a week?",
    tags: ["Nutrition", "Protein"],
    likes: 31,
    replies: 20,
  },
];

export default function HelpBoardPage() {
  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Help Board</h1>
        <Button size="sm" className="gap-1.5">
          <Plus size={15} />
          Ask
        </Button>
      </div>
      <p className="text-muted-foreground text-sm mb-5">
        Questions from your gym community
      </p>

      <div className="flex flex-col gap-3">
        {questions.map((q) => (
          <div key={q.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{q.author}</span>
              <span className="text-xs text-muted-foreground">{q.time}</span>
            </div>
            <p className="text-sm leading-snug mb-3">{q.question}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {q.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-xs shrink-0 ml-2">
                <span className="flex items-center gap-1">
                  <ThumbsUp size={13} />
                  {q.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={13} />
                  {q.replies}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
