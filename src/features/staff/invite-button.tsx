"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { inviteStaffAction } from "./actions";

/** Sends a Supabase invite email and links the login to this staff record. */
export function InviteButton({ staffId, email }: { staffId: number; email: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string>();

  return (
    <section className="hairline flex max-w-[880px] items-center justify-between gap-3 rounded-[8px] bg-surface px-3 py-2.5">
      <div>
        <div className="text-[13px] font-medium text-ink">No login yet</div>
        <div className="text-[12px] text-ink-4">
          {state === "sent"
            ? `Invite sent to ${email}.`
            : error ?? `Send an invite to ${email} so they can sign in.`}
        </div>
      </div>
      <Button
        icon={Send}
        disabled={state !== "idle"}
        onClick={async () => {
          setState("busy");
          setError(undefined);
          const result = await inviteStaffAction(staffId);
          if (!result.ok) {
            setError(result.error);
            setState("idle");
            return;
          }
          setState("sent");
          router.refresh();
        }}
      >
        {state === "busy" ? "Sending…" : state === "sent" ? "Sent" : "Send invite"}
      </Button>
    </section>
  );
}
