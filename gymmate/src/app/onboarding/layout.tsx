// Onboarding gets its own layout so it visually reads as a setup flow, not a
// regular signed-in app page. The bottom nav is hidden via the `hideNav` check
// (see components/bottom-nav.tsx) — onboarding screens should never compete
// for the user's attention with tabs.
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-1rem)] flex items-start justify-center px-4 py-8 pb-24">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
