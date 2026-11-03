"use client";

import { useState } from "react";
import { AuthCard, Field, FormError, SubmitButton } from "@/components/auth/auth-card";
import { createWorkspaceAction, signOutAction } from "@/app/auth-actions";

export function OnboardingForm({
  defaultName,
  defaultBusiness,
}: {
  defaultName: string;
  defaultBusiness: string;
}) {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const result = await createWorkspaceAction(
      String(form.get("business")),
      String(form.get("name")),
    );
    setBusy(false);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <AuthCard
      title="Set up your workspace"
      subtitle="If your team already uses Care OS, ask a superadmin to invite you instead."
      footer={
        <form action={signOutAction}>
          <button type="submit" className="font-medium text-ink hover:underline">
            Sign out
          </button>
        </form>
      }
    >
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Your name" name="name" defaultValue={defaultName} required />
        <Field label="Business name" name="business" defaultValue={defaultBusiness} required />
        <SubmitButton busy={busy}>Create workspace</SubmitButton>
      </form>
    </AuthCard>
  );
}
