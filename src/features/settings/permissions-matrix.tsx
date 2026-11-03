"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/shell/top-bar";
import { cn } from "@/lib/cn";
import {
  AREAS,
  LEVELS,
  LEVEL_LABELS,
  ROLE_LABELS,
  type AreaKey,
  type Level,
  type RoleKey,
} from "@/lib/permissions";
import { updatePermissionAction } from "./actions";

const EDITABLE_ROLES: RoleKey[] = ["service_manager", "scheduler", "support_worker"];

export type Matrix = Record<string, Record<string, Level>>;

/** Imploy's Settings → Permissions, in Lightfield's style. */
export function PermissionsMatrix({
  initial,
  editable,
}: {
  initial: Matrix;
  editable: boolean;
}) {
  const [role, setRole] = useState<RoleKey>("service_manager");
  const [matrix, setMatrix] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const change = (area: AreaKey, level: Level) => {
    const previous = matrix[role]?.[area] ?? "none";
    setMatrix((m) => ({ ...m, [role]: { ...m[role], [area]: level } }));
    setError(undefined);
    startTransition(async () => {
      const result = await updatePermissionAction(role, area, level);
      if (!result.ok) {
        setError(result.error);
        setMatrix((m) => ({ ...m, [role]: { ...m[role], [area]: previous } }));
      }
    });
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar icon={ShieldCheck} title="Permissions" />
      <div className="min-h-0 flex-1 overflow-y-auto pb-40">
        <div className="mx-auto w-full max-w-[760px] px-6 pt-6">
          <p className="mb-4 text-[13px] text-ink-4">
            Choose what each role can see and change. Superadmins always have full access. These
            rules are enforced by the database, not just hidden in the app.
            {!editable && " Only a superadmin can change them."}
          </p>

          <div className="mb-4 flex flex-wrap gap-1">
            {(["superadmin", ...EDITABLE_ROLES] as RoleKey[]).map((r) => (
              <button
                key={r}
                type="button"
                disabled={r === "superadmin"}
                onClick={() => setRole(r)}
                className={cn(
                  "h-6 rounded-[6px] border-[0.5px] px-[7px] text-[12px] font-medium",
                  r === role
                    ? "border-line bg-hover text-ink"
                    : "border-transparent text-ink-3 hover:bg-hover",
                  r === "superadmin" && "cursor-default text-ink-5 hover:bg-transparent",
                )}
                title={r === "superadmin" ? "Superadmin always has full access" : undefined}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
            {pending && <span className="ml-2 self-center text-[12px] text-ink-4">Saving…</span>}
            {error && <span className="ml-2 self-center text-[12px] text-[var(--red-ink)]">{error}</span>}
          </div>

          <div className="hairline rounded-[8px] bg-surface">
            {AREAS.map((area) => {
              const current = matrix[role]?.[area.key] ?? "none";
              return (
                <div
                  key={area.key}
                  className="flex items-center justify-between gap-4 border-b-[0.5px] border-line px-3 py-2.5 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-ink">{area.label}</div>
                    <div className="text-[12px] text-ink-4">{area.help}</div>
                  </div>
                  <div className="hairline flex shrink-0 overflow-hidden rounded-[6px]">
                    {LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        disabled={!editable || pending}
                        onClick={() => change(area.key, level)}
                        className={cn(
                          "h-6 border-l-[0.5px] border-line px-2 text-[12px] font-medium first:border-l-0",
                          current === level ? "bg-hover text-ink" : "text-ink-4 hover:bg-hover",
                          !editable && "cursor-default",
                        )}
                      >
                        {LEVEL_LABELS[level]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
