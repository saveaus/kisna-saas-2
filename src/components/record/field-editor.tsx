"use client";

import { useRef, useState } from "react";
import { Tag, User } from "lucide-react";
import { initials } from "@/lib/cn";
import type { FieldDef } from "@/lib/fields";
import type { FieldValue } from "@/lib/records";
import { Avatar, Chip } from "@/components/ui/primitives";
import { ChipSelect, formatDate } from "@/components/popup/popup";

/**
 * Inline editing for one field in a record's Details panel. Choices open the
 * same chip dropdown popups use. Everything else turns into an input: Enter or
 * clicking away saves, Esc cancels. A failed save stays open with the reason.
 */

/** Saves a field. Resolves to an error message, or undefined if it worked. */
export type FieldSave = (field: FieldDef, value: FieldValue) => Promise<string | undefined>;

/** "Set care recipient ID": lower-case, but acronyms like ACN and BSB stay as they are. */
function promptFor(label: string) {
  const words = label.split(" ").map((w) => (w === w.toUpperCase() ? w : w.toLowerCase()));
  return `Set ${words.join(" ")}`;
}

export function isEmptyValue(value: FieldValue) {
  return value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

export function FieldValueView({
  field,
  value,
  plain,
}: {
  field: FieldDef;
  value: FieldValue;
  /** No links: for use inside a button. */
  plain?: boolean;
}) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v) => (
          <Chip key={v}>{v}</Chip>
        ))}
      </div>
    );
  }
  if (field.type === "select") return <Chip>{String(value)}</Chip>;
  if (field.type === "date") return <span>{formatDate(String(value))}</span>;
  if (field.type === "percent") return <span>{value}%</span>;
  if (field.type === "email" && !plain)
    return (
      <a href={`mailto:${value}`} className="text-[var(--blue-ink)] hover:underline">
        {String(value)}
      </a>
    );
  if (field.type === "relation")
    return (
      <span className="inline-flex items-center gap-1.5">
        <Avatar label={initials(String(value))} size={16} />
        {String(value)}
      </span>
    );
  if (field.type === "longtext") return <span className="break-words whitespace-pre-wrap">{String(value)}</span>;
  return <span className="break-words">{String(value)}</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mt-1 text-[12px] text-[var(--red-ink)]">{message}</div>;
}

function ChoiceEditor({
  field,
  value,
  choices,
  onSave,
}: {
  field: FieldDef;
  value: FieldValue;
  choices: readonly string[];
  onSave: FieldSave;
}) {
  const multiple = field.type === "multiselect" || Boolean(field.many);
  // Shows the new choice straight away, until the saved value comes back.
  const [pending, setPending] = useState<{ value: FieldValue } | null>(null);
  const [error, setError] = useState<string>();
  const inFlight = useRef(0);
  const shown = pending ? pending.value : value;

  const save = async (next: FieldValue) => {
    if (field.required && next === undefined) return;
    setError(undefined);
    setPending({ value: next });
    inFlight.current += 1;
    const problem = await onSave(field, next);
    inFlight.current -= 1;
    if (problem) setError(problem);
    if (inFlight.current === 0) setPending(null);
  };

  return (
    <>
      <ChipSelect
        icon={field.type === "relation" ? User : Tag}
        placeholder={promptFor(field.label)}
        value={Array.isArray(shown) ? shown : shown === undefined ? undefined : String(shown)}
        options={choices}
        multiple={multiple}
        width={200}
        onChange={save}
      />
      <FieldError message={error} />
    </>
  );
}

const INPUT_CLASS =
  "hairline block w-full rounded-[6px] bg-surface px-1.5 text-[13px] outline-none disabled:opacity-60";

const INPUT_TYPE: Partial<Record<FieldDef["type"], string>> = {
  email: "email",
  phone: "tel",
  date: "date",
  number: "number",
  percent: "number",
};

function TextEditor({
  field,
  value,
  onSave,
}: {
  field: FieldDef;
  value: FieldValue;
  onSave: FieldSave;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const cancelled = useRef(false);

  const isList = field.type === "multiselect";
  const initial = Array.isArray(value) ? value.join(", ") : value === undefined ? "" : String(value);

  const commit = async (raw: string) => {
    if (cancelled.current || busy) return;
    const text = raw.trim();
    if (text === initial) {
      setError(undefined);
      setEditing(false);
      return;
    }
    const next: FieldValue = isList
      ? text.split(",").map((part) => part.trim()).filter(Boolean)
      : text || undefined;
    setBusy(true);
    setError(undefined);
    const problem = await onSave(field, next);
    setBusy(false);
    if (problem) setError(problem);
    else setEditing(false);
  };

  const cancel = () => {
    cancelled.current = true;
    setError(undefined);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          cancelled.current = false;
          setEditing(true);
        }}
        className="-mx-1 block min-h-5 w-[calc(100%+8px)] rounded-[4px] px-1 text-left hover:bg-hover"
      >
        {isEmptyValue(value) ? (
          <span className="text-ink-5">{promptFor(field.label)}…</span>
        ) : (
          <FieldValueView field={field} value={value} plain />
        )}
      </button>
    );
  }

  const shared = {
    autoFocus: true,
    defaultValue: initial,
    disabled: busy,
    "aria-label": field.label,
    onBlur: (e: { currentTarget: { value: string } }) => commit(e.currentTarget.value),
  };

  return (
    <>
      {field.type === "longtext" ? (
        <textarea
          {...shared}
          rows={4}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.blur();
          }}
          className={`${INPUT_CLASS} resize-y py-1 leading-5`}
        />
      ) : (
        <input
          {...shared}
          type={INPUT_TYPE[field.type] ?? "text"}
          placeholder={isList ? "Separate with commas" : undefined}
          step={field.type === "percent" ? "0.01" : undefined}
          min={field.type === "percent" ? 0 : undefined}
          max={field.type === "percent" ? 100 : undefined}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={`${INPUT_CLASS} h-7`}
        />
      )}
      <FieldError message={error} />
    </>
  );
}

export function FieldEditor({
  field,
  value,
  options,
  onSave,
}: {
  field: FieldDef;
  value: FieldValue;
  /** Choices for relations, e.g. staff names. Otherwise the field's own options. */
  options?: readonly string[];
  onSave: FieldSave;
}) {
  const choices = options ?? field.options;
  if (choices?.length) {
    return <ChoiceEditor field={field} value={value} choices={choices} onSave={onSave} />;
  }
  return <TextEditor field={field} value={value} onSave={onSave} />;
}
