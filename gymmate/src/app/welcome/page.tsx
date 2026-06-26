import Link from "next/link";
import type { Metadata } from "next";
import {
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Flame,
  Dumbbell,
  ChevronRight,
} from "lucide-react";

/**
 * Marketing landing — the page a logged-out visitor lands on when they
 * click a shared link. Pitches the wedge in one scroll: find a gym partner
 * near you, match by schedule/goals, plan real meetups, stay accountable.
 *
 * Routed to from middleware when an unauthenticated visitor hits `/`. The
 * page itself is logged-out-only — middleware bounces logged-in users back
 * to the deck so they never see this surface twice.
 */

export const metadata: Metadata = {
  title: "GymMate — Find a gym partner near you",
  description:
    "Match with lifters near you by gym, schedule overlap, and training goals. Plan a session, show up, stay accountable.",
};

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar — simple, just the brand + log-in link */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell size={16} className="text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">GymMate</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold text-primary mb-6">
          <Sparkles size={12} />
          For lifters who actually show up
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-3xl mx-auto">
          Find your{" "}
          <span className="bg-gradient-to-r from-primary to-rose-400 bg-clip-text text-transparent">
            gym partner
          </span>{" "}
          near you.
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground mt-6 max-w-xl mx-auto leading-relaxed">
          Match with lifters by gym, schedule, and training goals. Pick a
          time, show up, and stay accountable — together.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
          >
            Get started
            <ChevronRight size={16} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/70 transition-colors"
          >
            I have an account
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-5">
          Free to use. 18+. No payment, no nutrition tracking, no nonsense.
        </p>
      </section>

      {/* The three pillars — the bits that make GymMate different from a
          generic fitness app. Each one maps to a feature we actually shipped. */}
      <section className="max-w-5xl mx-auto px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          <PillarCard
            icon={<Clock size={20} />}
            title="Schedule overlap matching"
            body="We rank lifters by how often you'd actually cross paths at the gym. Same gym at 6 a.m. on Tuesdays? That's the top of your deck — not a random user 50 km away."
          />
          <PillarCard
            icon={<Users size={20} />}
            title="Real meetups, not just chats"
            body="Post a session. Others RSVP with one tap. Check in after — your profile shows how many people you've trained with this week. Conversation has a destination."
          />
          <PillarCard
            icon={<ShieldCheck size={20} />}
            title="Built for in-person trust"
            body="Verified profiles, report from any screen, block-in-one-tap, safety nudges in chat before you meet for the first time. Made for offline meetups, not just inboxes."
          />
        </div>
      </section>

      {/* How it works — three simple steps, no marketing fluff */}
      <section className="bg-secondary/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-5 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            How it works
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-md mx-auto mb-12">
            Three steps. Sixty seconds of setup. Real sessions by the end of
            the week.
          </p>

          <div className="grid gap-6 sm:grid-cols-3">
            <Step
              n={1}
              title="Set your training"
              body="Pick your gym, the times you usually train, and what you're looking for — a spotter, a partner, accountability."
            />
            <Step
              n={2}
              title="Match by overlap"
              body="Swipe through lifters near you, ranked by shared schedule and goals. Like back, lock in a match."
            />
            <Step
              n={3}
              title="Plan and show up"
              body="Message in-app, post a meetup, RSVP, check in after. Your weekly co-attendance stat shows up on Profile."
            />
          </div>
        </div>
      </section>

      {/* Closer — restate the wedge and the CTA */}
      <section className="max-w-3xl mx-auto px-5 py-20 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 mb-6">
          <Flame size={26} fill="currentColor" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">
          People who train together stick with it.
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
          Research is unambiguous: social accountability is the strongest
          single predictor of whether someone keeps showing up to the gym. We
          built one tool around that — not five.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
        >
          Find a partner
          <ChevronRight size={16} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin size={12} />
            <span>Made for lifters, by lifters.</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Log in
            </Link>
            <span className="opacity-50">
              &copy; {new Date().getFullYear()} GymMate
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PillarCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center sm:text-left">
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm mb-3">
        {n}
      </div>
      <h3 className="text-base font-bold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
