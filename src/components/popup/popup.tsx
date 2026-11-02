"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Calendar, Check, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { MenuDivider, Popover } from "@/components/ui/primitives";

/**
 * Lightfield task-adder style popup: a small centred card over a dimmed
 * page. Header (icon, label, close) · large title line · description ·
 * row of property chips · one primary button. Esc closes, Cmd/Ctrl+Enter
 * submits. Every create/edit popup (client, staff, shift…) uses this.
 */
export function Popup({
  open,
  onClose,
  icon: Icon,
  label,
  title,
  onTitleChange,
  titlePlaceholder = "Add title",
  description,
  onDescriptionChange,
  descriptionPlaceholder = "Description",
  chips,
  submitLabel,
  canSubmit,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  icon: LucideIcon;
  label: string;
  title: string;
  onTitleChange: (value: string) => void;
  titlePlaceholder?: string;
  description?: string;
  onDescriptionChange?: (value: string) => void;
  descriptionPlaceholder?: string;
  chips: ReactNode;
  submitLabel: string;
  canSubmit: boolean;
  onSubmit: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) onSubmit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, onSubmit, canSubmit]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-overlay pt-[18vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label={label}
        className="hairline w-full max-w-[640px] rounded-[10px] bg-[oklch(0.99_0_0)] shadow-popup"
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
            <Icon size={14} strokeWidth={1.75} className="text-ink-2" />
            {label}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-4 pt-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={titlePlaceholder}
            className="block w-full bg-transparent text-[18px] leading-7 font-medium text-ink outline-none placeholder:text-ink-5"
          />
          {onDescriptionChange && (
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={descriptionPlaceholder}
              rows={3}
              className="mt-2 block w-full resize-none bg-transparent text-[14px] leading-6 text-ink outline-none placeholder:text-ink-5"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 px-3 pt-3 pb-3">
          {chips}
        </div>

        <div className="flex items-center justify-end border-t-[0.5px] border-line px-3 py-2.5">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="h-7 rounded-[6px] bg-accent px-3 text-[12px] font-medium text-accent-ink disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Property chip with a searchable dropdown ---------- */
export function ChipSelect({
  icon: Icon,
  placeholder,
  value,
  options,
  onChange,
  disabled,
  disabledHint,
  multiple,
}: {
  icon: LucideIcon;
  placeholder: string;
  value: string | string[] | undefined;
  options: readonly string[];
  onChange: (value: string | string[] | undefined) => void;
  disabled?: boolean;
  disabledHint?: string;
  multiple?: boolean;
}) {
  const [query, setQuery] = useState("");
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );
  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected[0]} +${selected.length - 1}`;

  if (disabled) {
    return (
      <span
        title={disabledHint}
        className="hairline inline-flex h-7 cursor-not-allowed items-center gap-1.5 rounded-[6px] px-2 text-[12px] font-medium text-ink-5"
      >
        <Icon size={13} strokeWidth={1.75} />
        {placeholder}
      </span>
    );
  }

  return (
    <Popover
      width={240}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "hairline inline-flex h-7 items-center gap-1.5 rounded-[6px] bg-surface px-2 text-[12px] font-medium hover:bg-hover",
            selected.length ? "text-ink" : "text-ink-3",
          )}
        >
          <Icon size={13} strokeWidth={1.75} />
          {label}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="flex items-center gap-1.5 px-2 py-1">
            <Search size={13} className="text-ink-4" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-ink-5"
            />
          </div>
          <MenuDivider />
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-2 py-1.5 text-[13px] text-ink-4">No options</div>
            )}
            {filtered.map((opt) => {
              const isOn = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (multiple) {
                      const next = isOn
                        ? selected.filter((s) => s !== opt)
                        : [...selected, opt];
                      onChange(next.length ? next : undefined);
                    } else {
                      onChange(isOn ? undefined : opt);
                      close();
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1 text-left text-[13px] text-ink hover:bg-hover"
                >
                  <span className="w-3.5">{isOn && <Check size={13} />}</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </Popover>
  );
}

/* ---------- Text chip: a property chip that opens a small input ---------- */
export function TextChip({
  icon: Icon,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  icon: LucideIcon;
  placeholder: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  type?: "text" | "email" | "tel";
}) {
  return (
    <Popover
      width={260}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "hairline inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded-[6px] bg-surface px-2 text-[12px] font-medium hover:bg-hover",
            value ? "text-ink" : "text-ink-3",
          )}
        >
          <Icon size={13} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">{value || placeholder}</span>
        </button>
      )}
    >
      {(close) => (
        <input
          autoFocus
          type={type}
          defaultValue={value}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange(e.currentTarget.value.trim() || undefined);
              close();
            }
          }}
          onBlur={(e) => onChange(e.currentTarget.value.trim() || undefined)}
          className="block h-7 w-full rounded-[6px] bg-transparent px-2 text-[13px] outline-none placeholder:text-ink-5"
        />
      )}
    </Popover>
  );
}

/* ---------- Date chip with Lightfield's quick picks ---------- */
function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function short(d: Date) {
  return d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

export function formatDate(value: string | undefined) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function DateChip({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const picks: Array<[string, number]> = [
    ["Today", 0],
    ["Tomorrow", 1],
    ["7d from now", 7],
    ["30d from now", 30],
  ];
  return (
    <Popover
      width={220}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "hairline inline-flex h-7 items-center gap-1.5 rounded-[6px] bg-surface px-2 text-[12px] font-medium hover:bg-hover",
            value ? "text-ink" : "text-ink-3",
          )}
        >
          <Calendar size={13} strokeWidth={1.75} />
          {value ? formatDate(value) : placeholder}
        </button>
      )}
    >
      {(close) => (
        <>
          {picks.map(([label, days]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                onChange(iso(addDays(days)));
                close();
              }}
              className="flex w-full items-center justify-between rounded-[6px] px-2 py-1 text-[13px] text-ink hover:bg-hover"
            >
              <span className="flex items-center gap-2">
                <Calendar size={13} className="text-ink-3" />
                {label}
              </span>
              <span className="text-[12px] text-ink-4">{short(addDays(days))}</span>
            </button>
          ))}
          <MenuDivider />
          <label className="flex items-center gap-2 px-2 py-1 text-[13px] text-ink">
            Custom
            <input
              type="date"
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value || undefined)}
              className="hairline ml-auto h-6 rounded-[6px] bg-surface px-1 text-[12px]"
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                close();
              }}
              className="w-full rounded-[6px] px-2 py-1 text-left text-[13px] text-ink-3 hover:bg-hover"
            >
              Clear
            </button>
          )}
        </>
      )}
    </Popover>
  );
}
