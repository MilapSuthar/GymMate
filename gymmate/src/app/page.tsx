import { X, Heart, MapPin, Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const profile = {
  name: "Sarah K.",
  age: 24,
  gym: "PureGym City Centre",
  distance: "0.3 mi",
  tags: ["Powerlifting", "5AM Club", "Meal Prep"],
  bg: "from-violet-900 to-indigo-900",
};

export default function MatchPage() {
  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-4 gap-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Match</h1>
        <p className="text-muted-foreground text-sm mb-4">Gym-goers near you</p>

        <div className={`relative w-full rounded-3xl overflow-hidden bg-gradient-to-b ${profile.bg} aspect-[3/4]`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
              <Dumbbell size={48} className="text-white/40" />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
            <h2 className="text-xl font-bold text-white">
              {profile.name}, {profile.age}
            </h2>
            <div className="flex items-center gap-1 text-white/70 text-sm mt-0.5">
              <MapPin size={13} />
              <span>{profile.gym} · {profile.distance}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.tags.map((tag) => (
                <Badge key={tag} className="bg-white/15 text-white border-0 text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-8 mt-5">
          <button className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-destructive/20 hover:border-destructive transition-colors">
            <X size={26} className="text-muted-foreground" />
          </button>
          <button className="w-16 h-16 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg shadow-primary/30">
            <Heart size={26} className="text-primary-foreground" fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
