"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  LogOut,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { NAV, type NavGroup, type NavItem } from "@/lib/nav";
import { cn, initials } from "@/lib/cn";
import { MenuDivider, MenuLabel, Popover } from "@/components/ui/primitives";
import { signOutAction } from "@/app/auth-actions";

/* Lightfield sidebar: 268px wide, #f5f5f5-ish, 0.5px right border,
 * 32px items with 6px radius, 13px text, 12px section labels. */

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Item({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const base =
    "flex h-8 items-center gap-2 rounded-[6px] border-[0.5px] border-transparent px-[9px] text-[13px] leading-[18px]";

  if (!item.href) {
    return (
      <div
        className={cn(base, "cursor-default text-ink-5")}
        title={`Coming in Phase ${item.phase}`}
      >
        <Icon size={15} strokeWidth={1.75} className="shrink-0" />
        <span className="truncate">{item.label}</span>
      </div>
    );
  }

  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        base,
        active
          ? "bg-hover font-[450] text-ink"
          : "text-ink-2 hover:bg-hover hover:text-ink",
      )}
    >
      <Icon size={15} strokeWidth={1.75} className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function Group({
  group,
  pathname,
  hiddenHrefs,
}: {
  group: NavGroup;
  pathname: string;
  hiddenHrefs: string[];
}) {
  const [open, setOpen] = useState(group.defaultOpen ?? true);
  const items = group.items.filter((i) => !i.href || !hiddenHrefs.includes(i.href));
  return (
    <div className="flex flex-col gap-px">
      {group.label && (
        <button
          type="button"
          disabled={!group.collapsible}
          onClick={() => setOpen(!open)}
          className="flex h-7 items-center gap-1 px-[10px] pt-2 text-left text-[12px] font-medium text-ink-3 disabled:cursor-default"
        >
          {group.label}
          {group.collapsible &&
            (open ? (
              <ChevronDown size={12} strokeWidth={2} />
            ) : (
              <ChevronRight size={12} strokeWidth={2} />
            ))}
        </button>
      )}
      {open &&
        items.map((item) => (
          <Item key={item.label} item={item} pathname={pathname} />
        ))}
    </div>
  );
}

export function Sidebar({
  workspaceName,
  userName,
  roleLabel,
  hiddenHrefs,
  canOpenSettings,
}: {
  workspaceName: string;
  userName: string;
  roleLabel: string;
  hiddenHrefs: string[];
  canOpenSettings: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-[268px] shrink-0 flex-col border-r-[0.5px] border-line bg-sidebar">
      {/* Header: workspace menu + search + notifications */}
      <div className="flex h-10 items-center justify-between px-2">
        <Popover
          width={220}
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex h-7 items-center gap-2 rounded-[6px] px-1.5 text-[13px] font-medium text-ink hover:bg-hover"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[oklch(0.35_0.03_255)] text-[10px] font-semibold text-white">
                {initials(workspaceName).slice(0, 1)}
              </span>
              <span className="max-w-[150px] truncate">{workspaceName}</span>
              <ChevronDown size={12} className="text-ink-4" />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>
                {userName} · {roleLabel}
              </MenuLabel>
              {canOpenSettings && (
                <Link
                  href="/settings/permissions"
                  onClick={close}
                  className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1 text-[13px] leading-5 text-ink hover:bg-hover"
                >
                  <Settings size={14} strokeWidth={1.75} className="text-ink-3" />
                  Settings
                </Link>
              )}
              <MenuDivider />
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1 text-left text-[13px] leading-5 text-ink hover:bg-hover"
                >
                  <LogOut size={14} strokeWidth={1.75} className="text-ink-3" />
                  Sign out
                </button>
              </form>
            </>
          )}
        </Popover>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Search"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-2 hover:bg-hover"
          >
            <Search size={15} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-2 hover:bg-hover"
          >
            <Bell size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <Group group={NAV[0]} pathname={pathname} hiddenHrefs={hiddenHrefs} />

        <div className="flex flex-col gap-px">
          <div className="flex h-7 items-center px-[10px] pt-2 text-[12px] font-medium text-ink-3">
            Chats
          </div>
          <div
            className="flex h-8 cursor-default items-center gap-2 rounded-[6px] px-[9px] text-[13px] text-ink-5"
            title="Assistant arrives in Phase 5"
          >
            <Plus size={15} strokeWidth={1.75} />
            New chat
          </div>
        </div>

        {NAV.slice(1).map((group) => (
          <Group key={group.label} group={group} pathname={pathname} hiddenHrefs={hiddenHrefs} />
        ))}

        <div className="flex flex-col gap-px">
          <div className="flex h-7 items-center px-[10px] pt-2 text-[12px] font-medium text-ink-3">
            Lists
          </div>
          <div
            className="flex h-8 cursor-default items-center gap-2 rounded-[6px] px-[9px] text-[13px] text-ink-5"
            title="Saved lists arrive in Step 3"
          >
            <Plus size={15} strokeWidth={1.75} />
            New list
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          aria-label="Help"
          className="flex h-6 w-6 items-center justify-center rounded-full text-ink-3 hover:bg-hover"
        >
          <CircleHelp size={16} strokeWidth={1.75} />
        </button>
      </div>
    </nav>
  );
}
