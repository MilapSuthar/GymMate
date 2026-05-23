"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dumbbell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, AuthApiError } from "@/context/AuthContext";
import SocialLoginButtons from "@/components/social-login-buttons";

const MIN_AGE = 18;

function ageFromIsoDate(iso: string): number {
  const dob = new Date(iso);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
  return years;
}

const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(1, "Please confirm your password"),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })
  .refine((d) => ageFromIsoDate(d.dateOfBirth) >= MIN_AGE, {
    message: `You must be at least ${MIN_AGE} to use GymMate`,
    path: ["dateOfBirth"],
  });
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: doRegister } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setSubmitError(null);
    try {
      await doRegister(values.name, values.email, values.password, values.dateOfBirth);
      router.replace("/");
    } catch (err) {
      const msg =
        err instanceof AuthApiError ? err.message : "Something went wrong. Please try again.";
      setSubmitError(msg);
    }
  }

  // Max-allowable DOB = today minus 18 years. The browser then disables
  // picking a more recent date in the native date picker, which also gives
  // us a UX hint long before the form is submitted.
  const maxDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_AGE);
    return d.toISOString().split("T")[0];
  })();

  return (
    <div>
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-3">
          <Dumbbell size={24} className="text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground text-sm">Join the GymMate community</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Alex Smith"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...register("confirm")}
          />
          {errors.confirm && (
            <p className="text-xs text-destructive">{errors.confirm.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            max={maxDob}
            autoComplete="bday"
            aria-invalid={!!errors.dateOfBirth}
            {...register("dateOfBirth")}
          />
          <p className="text-xs text-muted-foreground">
            You must be {MIN_AGE} or older to use GymMate.
          </p>
          {errors.dateOfBirth && (
            <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
          )}
        </div>

        {submitError && (
          <p
            role="alert"
            data-testid="register-error"
            className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
          >
            {submitError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Create account"}
        </Button>
      </form>

      <div className="mt-4">
        <SocialLoginButtons nextHref="/" />
      </div>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
