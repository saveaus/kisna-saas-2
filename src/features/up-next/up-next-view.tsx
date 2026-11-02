"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell, CalendarDays, ChevronDown, Clock, List, ListChecks } from "lucide-react";
import { cn } from "@/lib/cn";
import { TopBar } from "@/components/shell/top-bar";

/* Lightfield's "Up next": today's date, then quiet sections with a
 * "Today" range chip. Shifts, tasks and alerts fill in as phases land. */

const noopSubscribe = () => () => {};

function Section({
  title,
  icon: Icon,
  empty,
}: {
  title: string;
  icon: typeof Clock;
  empty: string;
}) {
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
          <Icon size={14} strokeWidth={1.75} className="text-ink-3" />
          {title}
        </h2>
        <button
          type="button"
          className="flex h-6 items-center gap-1 rounded-[6px] px-1.5 text-[12px] font-medium text-ink-3 hover:bg-hover"
        >
          Today <ChevronDown size={12} />
        </button>
      </div>
      <div className="text-[13px] text-ink-5">{empty}</div>
    </section>
  );
}

export function UpNextView() {
  const [scope, setScope] = useState<"me" | "team">("team");
  // Read the date on the client only, so the page can still be prerendered.
  const today = useSyncExternalStore(
    noopSubscribe,
    () =>
      new Date().toLocaleDateString("en-AU", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    () => "",
  );

  return (
    <div className="flex h-full flex-col">
      <TopBar icon={Clock} title="Up next">
        <div className="flex items-center gap-1">
          {(
            [
              ["me", "Just me"],
              ["team", "My team"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope(key)}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[6px] border-[0.5px] px-[7px] text-[12px] font-medium",
                scope === key
                  ? "border-line bg-hover text-ink"
                  : "border-transparent text-ink-3 hover:bg-hover",
              )}
            >
              <List size={12} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </TopBar>
      <div className="min-h-0 flex-1 overflow-y-auto pb-40">
        <div className="mx-auto w-full max-w-[720px] px-6 pt-10">
          <h1 className="mb-8 text-[24px] leading-8 font-semibold tracking-tight text-ink">
            {today || " "}
          </h1>
          <Section title="Shifts" icon={CalendarDays} empty="No shifts. The roster arrives in Phase 2." />
          <Section title="Tasks" icon={ListChecks} empty="No tasks. Tasks arrive in Phase 6." />
          <Section
            title="Alerts"
            icon={Bell}
            empty="No alerts. Missed check-ins and expiring documents appear here from Phases 2 and 3."
          />
        </div>
      </div>
    </div>
  );
}
