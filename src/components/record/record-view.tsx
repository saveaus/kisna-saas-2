"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Link as LinkIcon,
  PanelRight,
  Plus,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn, initials } from "@/lib/cn";
import { isFieldVisible, type FieldDef, type FieldSection } from "@/lib/fields";
import type { FieldValue } from "@/lib/records";
import {
  Avatar,
  Button,
  Chip,
  MenuItem,
  Popover,
  StatusPill,
} from "@/components/ui/primitives";
import { FieldEditor, FieldValueView, isEmptyValue, type FieldSave } from "./field-editor";

/**
 * Reusable Lightfield-style record page: top bar with the record name and
 * its tabs inline, the selected tab in the main area, and a right-hand
 * Details panel with collapsible sections and related lists.
 */

export type RecordTab = {
  key: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
};

export type RelatedSection = {
  title: string;
  items: ReactNode[];
  empty: string;
  /** "See all" opens this tab. */
  tab?: string;
};

/** Turns on inline editing in the Details panel. */
export type RecordEditing = {
  canEdit: (field: FieldDef) => boolean;
  onSave: FieldSave;
  /** Choices for relation fields, by field key. */
  options?: Record<string, readonly string[]>;
};

/** An entry in the top bar's Create menu. */
export type CreateItem = {
  label: string;
  icon: LucideIcon;
  /** Opens this tab. */
  tab?: string;
  onSelect?: () => void;
};

export function RecordView({
  backHref,
  backLabel,
  name,
  status,
  idLabel,
  incomplete,
  tabs,
  detailsTitle,
  sections,
  record,
  related = [],
  editing,
  createItems = [],
}: {
  backHref: string;
  backLabel: string;
  name: string;
  status?: string;
  idLabel?: string;
  incomplete?: string[];
  tabs: RecordTab[];
  detailsTitle: string;
  sections: FieldSection[];
  record: Record<string, FieldValue>;
  related?: RelatedSection[];
  editing?: RecordEditing;
  createItems?: CreateItem[];
}) {
  const [tab, setTab] = useState(tabs[0]?.key);
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const active = tabs.find((t) => t.key === tab) ?? tabs[0];

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: back, name, … menu, inline tabs | link, create */}
        <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b-[0.5px] border-line px-3">
          <div className="flex min-w-0 items-center gap-1">
            <Link
              href={backHref}
              aria-label={`Back to ${backLabel}`}
              className="flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover"
            >
              <ChevronLeft size={15} />
            </Link>
            <div className="flex min-w-0 items-center gap-1.5 pr-1">
              <Avatar label={initials(name)} />
              <span className="max-w-[220px] truncate text-[13px] font-medium text-ink">
                {name}
              </span>
              <button
                type="button"
                aria-label="More"
                className="flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover"
              >
                <Ellipsis size={15} />
              </button>
            </div>
            <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "inline-flex h-6 shrink-0 items-center gap-1 rounded-[6px] border-[0.5px] px-[7px] text-[12px] font-medium",
                      t.key === active?.key
                        ? "border-line bg-hover text-ink"
                        : "border-transparent text-ink-3 hover:bg-hover",
                    )}
                  >
                    <Icon size={12} strokeWidth={1.75} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              aria-label="Copy link"
              title={copied ? "Copied" : "Copy link"}
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover"
            >
              <LinkIcon size={14} />
            </button>
            {createItems.length > 0 ? (
              <Popover
                align="right"
                width={180}
                trigger={({ toggle }) => (
                  <Button icon={Plus} onClick={toggle}>
                    Create
                  </Button>
                )}
              >
                {(close) =>
                  createItems.map((item) => (
                    <MenuItem
                      key={item.label}
                      icon={item.icon}
                      onClick={() => {
                        if (item.tab) setTab(item.tab);
                        item.onSelect?.();
                        close();
                      }}
                    >
                      {item.label}
                    </MenuItem>
                  ))
                }
              </Popover>
            ) : (
              <Button icon={Plus} disabled title="You don't have permission to add to this record">
                Create
              </Button>
            )}
            {!panelOpen && (
              <button
                type="button"
                aria-label="Show details"
                onClick={() => setPanelOpen(true)}
                className="flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover"
              >
                <PanelRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Status line */}
        <div className="flex shrink-0 items-center gap-2 px-4 pt-3">
          {status && <StatusPill status={status} />}
          {idLabel && <span className="text-[12px] text-ink-4">{idLabel}</span>}
          {incomplete && incomplete.length > 0 && (
            <span title={`Missing: ${incomplete.join(", ")}`}>
              <Chip tone="orange">
                <TriangleAlert size={12} className="mr-1" />
                Incomplete
              </Chip>
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-40">
          {active?.content}
        </div>
      </div>

      {panelOpen && (
        <aside className="flex w-[380px] shrink-0 flex-col border-l-[0.5px] border-line">
          <div className="flex h-10 shrink-0 items-center justify-between border-b-[0.5px] border-line px-4">
            <span className="text-[13px] font-medium text-ink">{detailsTitle}</span>
            <button
              type="button"
              aria-label="Hide details"
              onClick={() => setPanelOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover"
            >
              <PanelRight size={14} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-40">
            {sections.map((s, i) => (
              <DetailsSection
                key={s.title}
                section={s}
                record={record}
                defaultOpen={i < 2}
                editing={editing}
              />
            ))}
            {related.map((r) => (
              <div key={r.title} className="border-t-[0.5px] border-line py-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink">{r.title}</span>
                  {r.tab ? (
                    <button
                      type="button"
                      onClick={() => r.tab && setTab(r.tab)}
                      className="rounded-[4px] px-1 text-[12px] text-ink-4 hover:bg-hover"
                    >
                      See all
                    </button>
                  ) : (
                    <span className="text-[12px] text-ink-4">See all</span>
                  )}
                </div>
                {r.items.length ? (
                  <div className="flex flex-col gap-1">{r.items}</div>
                ) : (
                  <div className="text-[13px] text-ink-5">{r.empty}</div>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

function DetailsSection({
  section,
  record,
  defaultOpen,
  editing,
}: {
  section: FieldSection;
  record: Record<string, FieldValue>;
  defaultOpen: boolean;
  editing?: RecordEditing;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const fields = section.fields.filter((f) => isFieldVisible(f, record));
  if (fields.length === 0) return null;

  return (
    <div className="py-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 w-full items-center gap-1 text-[13px] font-medium text-ink"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {section.title}
      </button>
      {open && (
        <div className="flex flex-col">
          {fields.map((f) => (
            <FieldRow key={f.key} field={f} value={record[f.key]} editing={editing} />
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({
  field,
  value,
  editing,
}: {
  field: FieldDef;
  value: FieldValue;
  editing?: RecordEditing;
}) {
  return (
    <div className="flex min-h-8 items-start gap-3 py-1">
      <div className="w-[130px] shrink-0 pt-0.5 text-[13px] text-ink-4">
        {field.label}
        {field.required && <span className="text-ink-5"> *</span>}
      </div>
      <div className="min-w-0 flex-1 text-[13px] text-ink">
        {editing?.canEdit(field) ? (
          <FieldEditor
            field={field}
            value={value}
            options={editing.options?.[field.key]}
            onSave={editing.onSave}
          />
        ) : isEmptyValue(value) ? (
          <span className="text-ink-5">
            {field.calculated
              ? "Calculated"
              : field.arrives
                ? `Arrives in ${field.arrives}`
                : "Empty"}
          </span>
        ) : (
          <FieldValueView field={field} value={value} />
        )}
      </div>
    </div>
  );
}
