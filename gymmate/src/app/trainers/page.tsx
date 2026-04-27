import { Star, MapPin, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const trainers = [
  {
    id: 1,
    name: "Marcus Lee",
    specialty: "Strength & Conditioning",
    gym: "PureGym City Centre",
    rating: 4.9,
    reviews: 48,
    price: 45,
    tags: ["Powerlifting", "Weight Loss", "Beginners"],
    verified: true,
  },
  {
    id: 2,
    name: "Aisha Patel",
    specialty: "HIIT & Functional Fitness",
    gym: "Anytime Fitness",
    rating: 4.8,
    reviews: 33,
    price: 40,
    tags: ["HIIT", "Cardio", "Mobility"],
    verified: true,
  },
  {
    id: 3,
    name: "Ryan Torres",
    specialty: "Bodybuilding & Hypertrophy",
    gym: "JD Gyms",
    rating: 4.7,
    reviews: 61,
    price: 50,
    tags: ["Bodybuilding", "Nutrition", "Bulking"],
    verified: true,
  },
];

export default function TrainersPage() {
  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-1">Trainers</h1>
      <p className="text-muted-foreground text-sm mb-5">
        Certified PTs near your gym
      </p>

      <div className="flex flex-col gap-4">
        {trainers.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-xl font-bold text-muted-foreground shrink-0">
                {t.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">{t.name}</span>
                  {t.verified && (
                    <CheckCircle size={14} className="text-primary shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t.specialty}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin size={11} />
                  {t.gym}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold">£{t.price}</div>
                <div className="text-xs text-muted-foreground">/session</div>
              </div>
            </div>

            <div className="flex items-center gap-1 mt-3 mb-2">
              <Star size={13} className="text-primary fill-primary" />
              <span className="text-sm font-medium">{t.rating}</span>
              <span className="text-xs text-muted-foreground">({t.reviews} reviews)</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {t.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <Button className="w-full" size="sm">
              Book a Session
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
