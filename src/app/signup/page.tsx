"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard, Field, FormError, SubmitButton } from "@/components/auth/auth-card";
import { createClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/auth/setup-notice";
import { createWorkspaceAction } from "@/app/auth-actions";

/**
 * Create a login and a workspace. The person signing up becomes the
 * workspace's superadmin. Staff are added and invited from Staff.
 */
export default function SignupPage() {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  if (!isSupabaseConfigured) return <SetupNotice />;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    const business = String(form.get("business")).trim();
    setBusy(true);
    setError(undefined);

    const { data, error } = await createClient().auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        data: { name, business },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    if (!data.session) {
      // Email confirmation is on: finish after they click the link.
      setBusy(false);
      setCheckEmail(true);
      return;
    }
    const result = await createWorkspaceAction(business, name);
    setBusy(false);
    if (result && !result.ok) setError(result.error);
  }

  if (checkEmail) {
    return (
      <AuthCard title="Check your email" subtitle="Click the link we sent to confirm your address, then you'll set up your workspace.">
        <Link href="/login" className="block text-center text-[13px] font-medium text-ink hover:underline">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your workspace"
      subtitle="You'll be the superadmin and can invite your team after."
      footer={
        <>
          Already have a login?{" "}
          <Link href="/login" className="font-medium text-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Your name" name="name" autoComplete="name" required />
        <Field label="Business name" name="business" autoComplete="organization" required />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <SubmitButton busy={busy}>Create workspace</SubmitButton>
      </form>
    </AuthCard>
  );
}
