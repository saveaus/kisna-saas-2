"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, Field, FormError, SubmitButton } from "@/components/auth/auth-card";
import { createClient } from "@/lib/supabase/browser";

/** Invited staff land here from their email to choose a password. */
export default function SetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthCard title="Choose a password" subtitle="You'll use it to sign in to Care OS.">
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="New password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        <SubmitButton busy={busy}>Save password</SubmitButton>
      </form>
    </AuthCard>
  );
}
