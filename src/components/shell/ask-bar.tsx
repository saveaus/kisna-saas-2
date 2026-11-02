"use client";

import { usePathname } from "next/navigation";
import { CornerDownLeft, History, Paperclip, SlidersHorizontal, Table2 } from "lucide-react";
import { findClient, findStaff } from "@/lib/demo-data";

/* Lightfield's "Ask" composer: floats at the bottom of every page, 740px
 * max, white, 10px radius, 0.5px border, soft shadow, with a context chip
 * showing what's on screen. Not live until Phase 5. */

function contextLabel(pathname: string) {
  const [, section, id] = pathname.split("/");
  if (!section) return "Up next";
  if (section === "clients")
    return id ? findClient(Number(id))?.name ?? "Client" : "All Clients";
  if (section === "staff")
    return id ? findStaff(Number(id))?.name ?? "Staff" : "All Staff";
  if (section === "sites") return "All Sites";
  return section;
}

export function AskBar() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-6">
      <div
        className="hairline pointer-events-auto w-full max-w-[740px] rounded-[10px] bg-surface p-2 shadow-float"
        title="The assistant arrives in Phase 5"
      >
        <div className="mb-1 inline-flex h-5 items-center gap-1 rounded-[5px] border-[0.5px] border-line px-1.5 text-[11px] font-medium text-ink-2">
          <Table2 size={11} strokeWidth={1.75} />
          {contextLabel(pathname)}
        </div>
        <input
          disabled
          placeholder="Ask Care OS"
          className="block w-full bg-transparent px-1 py-1 text-[15px] leading-6 text-ink outline-none placeholder:text-ink-5"
        />
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-0.5 text-ink-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-[6px]">
              <History size={15} strokeWidth={1.75} />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-[6px]">
              <SlidersHorizontal size={15} strokeWidth={1.75} />
            </span>
          </div>
          <div className="flex items-center gap-1 text-ink-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-[6px]">
              <Paperclip size={15} strokeWidth={1.75} />
            </span>
            <span className="flex h-7 w-9 items-center justify-center rounded-[6px] bg-hover text-ink-5">
              <CornerDownLeft size={15} strokeWidth={1.75} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
