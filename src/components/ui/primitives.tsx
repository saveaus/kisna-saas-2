"use client";

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/* ---------- Button ----------
 * Lightfield buttons: 24px tall, 12px/500 text, 0.5px border, 6px radius.
 * "default" = white with a faint shadow (Create account)
 * "ghost"   = transparent with border (Display)
 * "subtle"  = 4% black fill (active view tab)
 * "primary" = accent fill (submit in popups)
 */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "subtle" | "primary" | "bare";
  icon?: LucideIcon;
  size?: "sm" | "md";
};

export function Button({
  variant = "default",
  icon: Icon,
  size = "sm",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] font-medium whitespace-nowrap transition-colors",
        "text-[12px] leading-4 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-6 px-[7px]" : "h-8 px-3 text-[13px]",
        variant === "default" &&
          "hairline bg-surface text-ink shadow-button hover:bg-[oklch(0.985_0_0)]",
        variant === "ghost" && "hairline text-ink hover:bg-hover",
        variant === "subtle" && "hairline bg-hover text-ink",
        variant === "primary" &&
          "bg-accent text-accent-ink hover:opacity-90 border-[0.5px] border-transparent",
        variant === "bare" &&
          "border-[0.5px] border-transparent text-ink-2 hover:bg-hover",
        className,
      )}
      {...props}
    >
      {Icon && <Icon size={14} strokeWidth={1.75} className="shrink-0" />}
      {children}
    </button>
  );
}

/* ---------- Chip (read-only value pill) ---------- */
export type Tone = "neutral" | "green" | "blue" | "orange" | "red" | "purple";

const toneClass: Record<Tone, string> = {
  neutral: "text-ink",
  green: "text-[var(--green-ink)] bg-[var(--green-bg)]",
  blue: "text-[var(--blue-ink)] bg-[var(--blue-bg)]",
  orange: "text-[var(--orange-ink)] bg-[var(--orange-bg)]",
  red: "text-[var(--red-ink)] bg-[var(--red-bg)]",
  purple: "text-[var(--purple-ink)] bg-[var(--purple-bg)]",
};

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "hairline inline-flex h-6 items-center rounded-[6px] px-[7px] text-[12px] leading-5 font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  return (
    <Chip tone={status === "Active" ? "green" : "neutral"}>{status}</Chip>
  );
}

export function Avatar({
  label,
  size = 20,
}: {
  label: string;
  size?: number;
}) {
  return (
    <span
      className="hairline inline-flex shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink-2"
      style={{ width: size, height: size }}
    >
      {label}
    </span>
  );
}

/* ---------- Popover ----------
 * Small floating panel anchored under its trigger. Closes on outside click
 * and Escape. Used for menus, filters, chip pickers.
 */
export function Popover({
  trigger,
  children,
  align = "left",
  width = 220,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  width?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = (value: boolean) => {
    setInnerOpen(value);
    onOpenChange?.(value);
  };
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({ open, toggle: () => setOpen(!open) })}
      {open && (
        <div
          className={cn(
            "hairline absolute top-full z-40 mt-1 rounded-[8px] bg-surface p-1 shadow-float",
            align === "right" ? "right-0" : "left-0",
          )}
          style={{ width }}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon: Icon,
  children,
  onClick,
  selected,
  disabled,
  hint,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[6px] px-2 py-1 text-left text-[13px] leading-5 text-ink",
        "hover:bg-hover disabled:cursor-not-allowed disabled:text-ink-5 disabled:hover:bg-transparent",
        selected && "bg-hover",
      )}
    >
      {Icon && (
        <Icon size={14} strokeWidth={1.75} className="shrink-0 text-ink-3" />
      )}
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="text-[12px] text-ink-4">{hint}</span>}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pt-1.5 pb-1 text-[12px] font-medium text-ink-4">
      {children}
    </div>
  );
}

export function MenuDivider() {
  return <div className="my-1 h-[0.5px] bg-line" />;
}

/** A quiet Delete button that asks once before doing anything. */
export function ConfirmDelete({
  label = "Delete",
  question = "Delete this?",
  disabled,
  onConfirm,
}: {
  label?: string;
  question?: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button variant="bare" disabled={disabled} onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
      {question}
      <Button
        variant="bare"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        Yes
      </Button>
      <Button variant="bare" onClick={() => setAsking(false)}>
        No
      </Button>
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
      <Icon size={20} strokeWidth={1.5} className="mb-1 text-ink-4" />
      <div className="text-[13px] font-medium text-ink">{title}</div>
      {body && <div className="max-w-sm text-[13px] text-ink-4">{body}</div>}
    </div>
  );
}
