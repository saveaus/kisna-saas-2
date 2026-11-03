"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, Field, FormError, SubmitButton } from "@/components/auth/auth-card";
import { createClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/auth/setup-notice";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured) return <SetupNotice />;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to Care OS"
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-ink hover:underline">
            Create a workspace
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>
    </AuthCard>
  );
}
