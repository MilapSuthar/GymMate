import Link from "next/link";
import type { Metadata } from "next";
import { Dumbbell, ArrowLeft } from "lucide-react";

/**
 * Privacy Policy — V1 plain-language template. Drafted to be readable and
 * cover GDPR/CCPA must-haves (what's collected, why, third-party processors,
 * user rights, contact). NOT a substitute for a lawyer review before public
 * launch, but the right starting document to put in a lawyer's hands.
 */

export const metadata: Metadata = {
  title: "Privacy Policy — GymMate",
  description: "How GymMate collects, uses, and protects your data.",
};

const EFFECTIVE_DATE = "January 2026";
const CONTACT_EMAIL = "tabhaigameover@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/welcome" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell size={16} className="text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">GymMate</span>
          </Link>
          <Link
            href="/welcome"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 prose-invert">
        <h1 className="text-3xl font-bold mb-1">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Effective {EFFECTIVE_DATE}
        </p>

        <Section title="The short version">
          <p>
            GymMate helps you find a gym partner near you. To make that work
            we collect a small amount of information about you — your account
            info, your profile, your location, and the messages you send
            inside the app. We don&apos;t sell your data. You can export
            everything we hold on you and delete your account at any time
            from your profile page.
          </p>
        </Section>

        <Section title="What we collect">
          <p>
            When you create an account we store your email address, a name,
            and (for credentials accounts) a hashed password. We never store
            your password in plain text. If you sign in with Google or Apple,
            we receive your email and basic profile from the provider.
          </p>
          <p>
            On your profile you may add a display name, bio, age, gender,
            gym, fitness goals, preferred training schedule, what you&apos;re
            looking for in a partner, and up to {6} photos. All of this is
            visible to other GymMate users you can be matched with.
          </p>
          <p>
            With your permission, your browser shares your approximate
            location. We use it to rank candidates by distance and to compute
            the &quot;{0.0} km apart&quot; line on match cards. You can deny
            permission at any time; distance ranking simply turns off.
          </p>
          <p>
            We store the messages you send to other users so the
            conversations work across sessions. We do not read those messages
            unless a user reports a chat to us under our community standards.
          </p>
        </Section>

        <Section title="Why we use it">
          <p>
            Email and password are for authentication and account recovery.
            Your profile is what other users see in the discovery deck and on
            the matches list. Location, schedule, and looking-for tags drive
            the matching algorithm — they&apos;re the reason the people you
            see are people you&apos;d actually train with. Messages let you
            coordinate sessions inside the app instead of moving the
            conversation off-platform before you trust each other.
          </p>
          <p>
            We also log basic operational data (timestamps, error reports)
            so we can diagnose problems and improve the product.
          </p>
        </Section>

        <Section title="Third parties we share with">
          <p>
            We use a small number of operational service providers, each only
            for the specific job listed. We don&apos;t share your data with
            advertisers, data brokers, or anyone outside this list.
          </p>
          <ul>
            <li>
              <strong>Firebase Authentication</strong> (Google) — handles
              Continue-with-Google / Apple sign-in if you choose those.
            </li>
            <li>
              <strong>Hosting provider</strong> (e.g. Vercel) — runs the app
              servers. Sees encrypted traffic only.
            </li>
            <li>
              <strong>Database provider</strong> (e.g. Neon / Supabase) —
              stores the application data described above.
            </li>
            <li>
              <strong>Email delivery</strong> (e.g. Resend / Postmark) —
              sends transactional email like password resets.
            </li>
            <li>
              <strong>Stripe</strong> — processes payments when the trainer
              marketplace is enabled. We never see your full card number.
            </li>
          </ul>
        </Section>

        <Section title="Your rights">
          <p>
            You can <em>access</em> everything we hold on you by going to
            Profile → Account → Export my data. The download is a JSON file
            that includes your profile, photos, swipes, matches, messages,
            meetups, RSVPs, notifications, and any reports or blocks you
            authored.
          </p>
          <p>
            You can <em>delete</em> your account by going to Profile →
            Account → Delete my account. This permanently removes your
            profile, photos, matches, messages, meetups, and RSVPs. It
            cannot be undone.
          </p>
          <p>
            If you are in the EU/UK or California you also have the right to
            object to processing, request correction, and lodge a complaint
            with your local data protection authority.
          </p>
        </Section>

        <Section title="Cookies and similar technology">
          <p>
            We use a single first-party HTTP-only cookie ({"`gm_refresh`"})
            to keep you signed in across page loads. We do not use
            third-party advertising or tracking cookies. PostHog analytics, if
            enabled, uses a first-party cookie only.
          </p>
        </Section>

        <Section title="Children">
          <p>
            GymMate is for adults. You must be at least 18 to use it. We
            enforce a date-of-birth gate at signup. If we learn that a user
            is under 18 we will remove their account.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we update this policy we&apos;ll change the effective date at
            the top and, for material changes, notify you in-app before the
            change takes effect.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, requests, or complaints:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            . We aim to respond within 14 days.
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:hover:underline [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-3xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} GymMate</span>
        <div className="flex items-center gap-5">
          <Link href="/welcome" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hover:text-foreground transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
