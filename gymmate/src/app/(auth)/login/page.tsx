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

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setSubmitError(null);
    try {
      await login(values.email, values.password);
      router.replace("/");
    } catch (err) {
      const msg =
        err instanceof AuthApiError ? err.message : "Something went wrong. Please try again.";
      setSubmitError(msg);
    }
  }

  return (
    <div>
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-3">
          <Dumbbell size={24} className="text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Log in to GymMate</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {submitError && (
          <p
            role="alert"
            data-testid="login-error"
            className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
          >
            {submitError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Log in"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        New to GymMate?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
