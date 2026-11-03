import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

/** Signed in but not in a workspace yet (e.g. after confirming email). */
export default async function OnboardingPage() {
  if (!isSupabaseConfigured) redirect("/");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("staff")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "Active")
    .limit(1)
    .maybeSingle();
  if (membership) redirect("/");

  const meta = user.user_metadata as { name?: string; business?: string };
  return <OnboardingForm defaultName={meta.name ?? ""} defaultBusiness={meta.business ?? ""} />;
}
