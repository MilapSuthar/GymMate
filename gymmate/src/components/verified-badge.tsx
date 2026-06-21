import { Check } from "lucide-react";

/**
 * The trust ribbon — a small sky-blue badge with a white check, rendered
 * next to a user's name when their profile has been verified. Selfie-match
 * verification ships in V1.2; the badge surface is built now so the trust
 * mechanic is visible from day one and we don't have to retrofit every
 * name-rendering location later.
 */
export default function VerifiedBadge({
  size = 14,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      title="Verified profile"
      aria-label="Verified profile"
      data-testid="verified-badge"
      className={`inline-flex items-center justify-center rounded-full bg-sky-500 shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Check
        size={Math.round(size * 0.65)}
        strokeWidth={3.5}
        className="text-white"
      />
    </span>
  );
}
