"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import type { AuthState } from "@/lib/auth/actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 size={15} className="animate-spin" /> : null}
      {pending ? "Working…" : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  action,
}: {
  mode: "signin" | "signup";
  action: (prev: AuthState, fd: FormData) => Promise<AuthState>;
}) {
  const [state, formAction] = useActionState(action, {} as AuthState);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-[12.5px] text-red-300">{state.error}</p>
        </div>
      )}

      {isSignup && (
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-ink-300">Name</label>
          <Input name="name" placeholder="Alex Rivera" autoComplete="name" />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-ink-300">Email</label>
        <Input
          name="email"
          type="email"
          required
          placeholder="you@company.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-ink-300">Password</label>
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder={isSignup ? "At least 8 characters" : "••••••••"}
          autoComplete={isSignup ? "new-password" : "current-password"}
        />
      </div>

      <Submit label={isSignup ? "Create account" : "Sign in"} />

      <p className="text-center text-[12.5px] text-ink-400">
        {isSignup ? "Already have an account? " : "New to AlphaStack? "}
        <Link
          href={isSignup ? "/signin" : "/signup"}
          className="font-medium text-brand-400 hover:text-brand-300"
        >
          {isSignup ? "Sign in" : "Create one free"}
        </Link>
      </p>
    </form>
  );
}
