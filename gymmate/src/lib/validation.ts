import { z } from "zod";
import { NextResponse } from "next/server";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
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
