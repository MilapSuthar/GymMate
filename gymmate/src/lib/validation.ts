import { z } from "zod";
import { NextResponse } from "next/server";

/** Inclusive minimum legal age. Matches MIN_USER_AGE in lib/profile.ts. */
const MIN_AGE = 18;

/** Compute integer age from an ISO date string (YYYY-MM-DD). */
function ageFromIsoDate(iso: string): number {
  const dob = new Date(iso);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
  return years;
}

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().toLowerCase().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    // Required ISO date string (YYYY-MM-DD) — comes from <input type="date">.
    // We accept the string here and parse in the route handler so we don't
    // depend on Zod's date coercion behaviour across versions.
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  })
  .refine((d) => ageFromIsoDate(d.dateOfBirth) >= MIN_AGE, {
    message: `You must be at least ${MIN_AGE} years old to use GymMate`,
    path: ["dateOfBirth"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const googleSchema = z.object({
  idToken: z.string().min(1, "idToken is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export async function parseJson<T extends z.ZodTypeAny>(req: Request, schema: T):
  Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { data: null, error: badRequest("Invalid JSON body") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      data: null,
      error: badRequest("Validation failed", parsed.error.flatten().fieldErrors),
    };
  }
  return { data: parsed.data, error: null };
}
