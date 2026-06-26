import Link from "next/link";
import type { Metadata } from "next";
import { Dumbbell, ArrowLeft } from "lucide-react";

/**
 * Terms of Service — V1 plain-language template. Covers account use,
 * acceptable behaviour, meetup risk disclaimer, account termination, and
 * standard limitation/disclaimer language. Pair with a lawyer review before
 * public launch; the meetup risk and limitation clauses in particular need
 * jurisdiction-specific tightening.
 */

export const metadata: Metadata = {
  title: "Terms of Service — GymMate",
  description: "The rules of using GymMate.",
};

const EFFECTIVE_DATE = "January 2026";
const CONTACT_EMAIL = "tabhaigameover@gmail.com";

export default function TermsPage() {
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

      <main className="max-w-3xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-bold mb-1">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Effective {EFFECTIVE_DATE}
        </p>

        <Section title="Who can use GymMate">
          <p>
            GymMate is for people aged 18 and over. You must provide accurate
            information when you create an account. One account per person.
            Don&apos;t create an account on behalf of someone else.
          </p>
        </Section>

        <Section title="Your account">
          <p>
            Keep your password (or the OAuth account you sign in with) safe.
            You&apos;re responsible for activity on your account. Tell us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary hover:underline"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            if you think someone else has accessed it.
          </p>
        </Section>

        <Section title="What you post">
          <p>
            Profiles, photos, bios, meetups, and messages are content you
            create. By posting them you grant GymMate a non-exclusive licence
            to host, display, and transmit them in the course of running the
            service. You keep ownership of your content.
          </p>
          <p>
            Don&apos;t post content that is illegal, harassing, hateful,
            sexually explicit, or that impersonates someone else. Don&apos;t
            post photos that aren&apos;t of you. Don&apos;t use GymMate to
            advertise, sell products, or recruit users to other services.
          </p>
        </Section>

        <Section title="How you treat other people">
          <p>
            GymMate exists for people to plan and attend real-world workout
            sessions together. That works only if everyone behaves well. We
            ask you to:
          </p>
          <ul>
            <li>Treat other lifters with respect, including when you say no.</li>
            <li>
              Not send unsolicited explicit content or repeated unwanted
              messages.
            </li>
            <li>Honour the RSVPs you make. If you can&apos;t make it, say so.</li>
            <li>
              Use the report function for anything you feel is unsafe or
              against these rules.
            </li>
          </ul>
          <p>
            Reports are reviewed by our team. We may warn, suspend, or
            permanently terminate accounts that break these rules.
          </p>
        </Section>

        <Section title="Meetups happen in the real world">
          <p>
            GymMate connects people; it does not run the sessions you plan.
            What you do, where you go, and who you choose to meet is your
            responsibility. We strongly recommend you meet for the first time
            in a public gym at a busy hour and tell someone you trust where
            you&apos;re going.
          </p>
          <p>
            We don&apos;t conduct background checks on users. The verified
            badge confirms a selfie match against a profile photo; it
            doesn&apos;t guarantee anything about a person beyond that.
          </p>
        </Section>

        <Section title="Account termination">
          <p>
            You can delete your account at any time from Profile → Account →
            Delete my account. We may terminate or suspend your account if
            you violate these terms, if your use of the service creates risk
            for other users, or if we&apos;re required to by law. Where we
            can give notice before terminating, we will.
          </p>
        </Section>

        <Section title="Disclaimer and limitation of liability">
          <p>
            The service is provided &quot;as is.&quot; To the maximum extent
            permitted by law, GymMate is not liable for indirect, incidental,
            or consequential damages arising from your use of the service or
            from meetings arranged through the service. Nothing in these
            terms excludes liability that cannot be excluded under
            applicable law.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms from time to time. If we make material
            changes we&apos;ll notify you in-app before they take effect.
            Continued use of GymMate after the effective date means you
            accept the updated terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
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
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
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
