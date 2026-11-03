"use client";

import { useRef, useState } from "react";
import { Pencil, Tag, User } from "lucide-react";
import { initials } from "@/lib/cn";
import type { FieldDef } from "@/lib/fields";
import type { FieldValue } from "@/lib/records";
import { Avatar, Chip } from "@/components/ui/primitives";
import { ChipSelect, formatDate } from "@/components/popup/popup";

/**
 * Inline editing for one field in a record's Details panel. Choices open the
 * same chip dropdown popups use. Everything else turns into an input: Enter or
 * clicking away saves, Esc cancels. The new value shows straight away while it
 * saves. A failed save reopens with what was typed and the reason.
 */

/** Saves a field. Resolves to an error message, or undefined if it worked. */
export type FieldSave = (field: FieldDef, value: FieldValue) => Promise<string | undefined>;

/** "Set care recipient ID": lower-case, but acronyms like ACN and BSB stay as they are. */
function promptFor(label: string) {
  const words = label.split(" ").map((w) => (w === w.toUpperCase() ? w : w.toLowerCase()));
  return `Set ${words.join(" ")}`;
}

const sameValue = (a: FieldValue, b: FieldValue) => JSON.stringify(a) === JSON.stringify(b);

/** The save's error message, including when the request itself fails. */
async function attemptSave(save: () => Promise<string | undefined>) {
  try {
    return await save();
  } catch {
    return "Couldn't save. Refresh the page and try again.";
  }
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
    const problem = await attemptSave(() => onSave(field, next));
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
  "hairline block w-full rounded-[6px] bg-surface px-1.5 text-[13px] outline-none";

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
  const [saving, setSaving] = useState(false);
  // What was typed, kept if a save fails so it isn't lost.
  const [draft, setDraft] = useState<string>();
  // Shows the new value straight away. The page's own value takes over when it arrives.
  const [saved, setSaved] = useState<{ value: FieldValue; from: FieldValue } | null>(null);
  const [error, setError] = useState<string>();
  const cancelled = useRef(false);

  const current = saved && sameValue(value, saved.from) ? saved.value : value;
  const isList = field.type === "multiselect";
  const initial = Array.isArray(current) ? current.join(", ") : current === undefined ? "" : String(current);

  const commit = async (raw: string) => {
    if (cancelled.current) return;
    const text = raw.trim();
    if (text === initial) {
      setError(undefined);
      setDraft(undefined);
      setEditing(false);
      return;
    }
    const next: FieldValue = isList
      ? text.split(",").map((part) => part.trim()).filter(Boolean)
      : text || undefined;
    setError(undefined);
    setDraft(undefined);
    setEditing(false);
    setSaving(true);
    setSaved({ value: next, from: value });
    const problem = await attemptSave(() => onSave(field, next));
    setSaving(false);
    if (problem) {
      setSaved(null);
      setDraft(raw);
      setError(problem);
      setEditing(true);
    }
  };

  const cancel = () => {
    cancelled.current = true;
    setError(undefined);
    setDraft(undefined);
    setEditing(false);
  };

  if (!editing) {
    return (
      <>
        <button
          type="button"
          disabled={saving}
          aria-label={`Edit ${field.label}`}
          onClick={() => {
            cancelled.current = false;
            setEditing(true);
          }}
          className="group -mx-1 flex min-h-5 w-[calc(100%+8px)] cursor-text items-start gap-1 rounded-[4px] px-1 text-left hover:bg-hover disabled:cursor-default"
        >
          <span className="min-w-0 flex-1">
            {isEmptyValue(current) ? (
              <span className="text-ink-5">{promptFor(field.label)}…</span>
            ) : (
              <FieldValueView field={field} value={current} plain />
            )}
          </span>
          <Pencil
            size={12}
            strokeWidth={1.75}
            aria-hidden
            className="mt-1 shrink-0 text-ink-4 opacity-0 group-hover:opacity-100"
          />
        </button>
        {saving && <div className="mt-0.5 text-[12px] text-ink-4">Saving…</div>}
      </>
    );
  }

  const shared = {
    autoFocus: true,
    defaultValue: draft ?? initial,
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
