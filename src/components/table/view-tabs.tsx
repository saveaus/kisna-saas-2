"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, Pencil, Plus, Save, Table2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { MenuDivider, MenuItem, MenuLabel, Popover } from "@/components/ui/primitives";
import { VIEW_NAME_MAX, type Filter, type View, type ViewObject } from "@/lib/views";
import { createViewAction, deleteViewAction, updateViewAction } from "@/features/views/actions";

/**
 * Lightfield-style view tabs: "All" plus the person's saved views.
 * Click + to save the current filters as a named view. Click the open view's
 * tab for Rename, Update filters and Delete. Views are saved to the database.
 */
export function ViewTabs({
  allView,
  views,
  setViews,
  activeKey,
  onSelect,
  activeFilters,
  extraFilters,
  clearExtraFilters,
  presets,
  viewObject,
}: {
  allView: View;
  views: View[];
  setViews: Dispatch<SetStateAction<View[]>>;
  activeKey: string;
  onSelect: (key: string) => void;
  /** View filters plus any added on top. */
  activeFilters: Filter[];
  /** Only the filters added on top of the open view. */
  extraFilters: Filter[];
  clearExtraFilters: () => void;
  presets: View[];
  viewObject?: ViewObject;
}) {
  const [error, setError] = useState<string>();

  const save = async (name: string, filters: Filter[]) => {
    if (!viewObject) return "Views can't be saved here.";
    const result = await createViewAction(viewObject, name, filters);
    if (!result.ok) return result.error;
    const view: View = { id: result.id, key: `saved-${result.id}`, label: name.trim(), filters };
    setViews((prev) => [...prev, view]);
    clearExtraFilters();
    onSelect(view.key);
    return undefined;
  };

  const rename = async (view: View, name: string) => {
    if (!view.id) return "This view can't be renamed.";
    const result = await updateViewAction(view.id, { name });
    if (!result.ok) return result.error;
    setViews((prev) => prev.map((v) => (v.key === view.key ? { ...v, label: name.trim() } : v)));
    return undefined;
  };

  const updateFilters = async (view: View) => {
    if (!view.id) return;
    const result = await updateViewAction(view.id, { filters: activeFilters });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setViews((prev) => prev.map((v) => (v.key === view.key ? { ...v, filters: activeFilters } : v)));
    clearExtraFilters();
  };

  const remove = async (view: View) => {
    if (!view.id) return;
    const result = await deleteViewAction(view.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setViews((prev) => prev.filter((v) => v.key !== view.key));
    onSelect(allView.key);
  };

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Tab view={allView} active={activeKey === allView.key} onSelect={onSelect} />
      {views.map((v) =>
        v.key === activeKey ? (
          <ViewMenu
            key={v.key}
            view={v}
            hasExtraFilters={extraFilters.length > 0}
            onRename={(name) => rename(v, name)}
            onUpdateFilters={() => updateFilters(v)}
            onDelete={() => remove(v)}
          />
        ) : (
          <Tab key={v.key} view={v} active={false} onSelect={onSelect} />
        ),
      )}
      {viewObject && (
        <SaveViewButton
          hasFilters={activeFilters.length > 0}
          defaultName={views.length ? "" : presets[0]?.label ?? ""}
          presets={presets}
          onSave={(name) => save(name, activeFilters)}
          onSavePreset={(preset) => save(preset.label, preset.filters)}
        />
      )}
      {error && <span className="ml-1 text-[12px] text-[var(--red-ink)]">{error}</span>}
    </div>
  );
}

const tabClass = (active: boolean) =>
  cn(
    "inline-flex h-6 max-w-[180px] items-center gap-1 rounded-[6px] border-[0.5px] px-[7px] text-[12px] font-medium",
    active ? "border-line bg-hover text-ink" : "border-transparent text-ink-3 hover:bg-hover",
  );

function Tab({
  view,
  active,
  onSelect,
}: {
  view: View;
  active: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <button type="button" onClick={() => onSelect(view.key)} className={tabClass(active)}>
      <Table2 size={12} strokeWidth={1.75} className="shrink-0" />
      <span className="truncate">{view.label}</span>
    </button>
  );
}

/** The open saved view: its tab opens Rename / Update filters / Delete. */
function ViewMenu({
  view,
  hasExtraFilters,
  onRename,
  onUpdateFilters,
  onDelete,
}: {
  view: View;
  hasExtraFilters: boolean;
  onRename: (name: string) => Promise<string | undefined>;
  onUpdateFilters: () => void;
  onDelete: () => void;
}) {
  const [mode, setMode] = useState<"menu" | "rename" | "delete">("menu");
  const [error, setError] = useState<string>();

  return (
    <Popover
      width={230}
      onOpenChange={(open) => {
        if (!open) {
          setMode("menu");
          setError(undefined);
        }
      }}
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className={tabClass(true)} title="View options">
          <Table2 size={12} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">{view.label}</span>
          <ChevronDown size={11} className="shrink-0 text-ink-4" />
        </button>
      )}
    >
      {(close) =>
        mode === "rename" ? (
          <NameForm
            initial={view.label}
            submitLabel="Rename"
            error={error}
            onSubmit={async (name) => {
              const err = await onRename(name);
              if (err) setError(err);
              else close();
            }}
          />
        ) : mode === "delete" ? (
          <div className="p-1">
            <p className="px-1 pb-2 text-[13px] text-ink">Delete “{view.label}”?</p>
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="h-6 rounded-[6px] px-2 text-[12px] font-medium text-ink-3 hover:bg-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  close();
                }}
                className="h-6 rounded-[6px] bg-[var(--red-ink)] px-2 text-[12px] font-medium text-white"
              >
                Delete view
              </button>
            </div>
          </div>
        ) : (
          <>
            <MenuItem icon={Pencil} onClick={() => setMode("rename")}>
              Rename
            </MenuItem>
            <MenuItem
              icon={Save}
              disabled={!hasExtraFilters}
              onClick={() => {
                onUpdateFilters();
                close();
              }}
              hint={hasExtraFilters ? undefined : "add a filter"}
            >
              Save filters to view
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={Trash2} onClick={() => setMode("delete")}>
              Delete view
            </MenuItem>
          </>
        )
      }
    </Popover>
  );
}

/** "+" next to the tabs: name the current filters, or start from a preset. */
function SaveViewButton({
  hasFilters,
  defaultName,
  presets,
  onSave,
  onSavePreset,
}: {
  hasFilters: boolean;
  defaultName: string;
  presets: View[];
  onSave: (name: string) => Promise<string | undefined>;
  onSavePreset: (preset: View) => Promise<string | undefined>;
}) {
  const [error, setError] = useState<string>();
  return (
    <Popover
      width={250}
      onOpenChange={(open) => !open && setError(undefined)}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          title="New view"
          aria-label="New view"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover"
        >
          <Plus size={14} />
        </button>
      )}
    >
      {(close) => (
        <>
          {hasFilters ? (
            <NameForm
              initial=""
              placeholder={defaultName || "View name"}
              submitLabel="Save view"
              error={error}
              onSubmit={async (name) => {
                const err = await onSave(name);
                if (err) setError(err);
                else close();
              }}
            />
          ) : (
            <p className="px-2 py-1.5 text-[12px] text-ink-4">
              Add a filter, then save it here as a named view.
            </p>
          )}
          {presets.length > 0 && (
            <>
              <MenuDivider />
              <MenuLabel>Or start from</MenuLabel>
              {presets.map((p) => (
                <MenuItem
                  key={p.key}
                  icon={Table2}
                  onClick={async () => {
                    const err = await onSavePreset(p);
                    if (err) setError(err);
                    else close();
                  }}
                >
                  {p.label}
                </MenuItem>
              ))}
              {error && !hasFilters && (
                <p className="px-2 pb-1 text-[12px] text-[var(--red-ink)]">{error}</p>
              )}
            </>
          )}
        </>
      )}
    </Popover>
  );
}

function NameForm({
  initial,
  placeholder,
  submitLabel,
  error,
  onSubmit,
}: {
  initial: string;
  placeholder?: string;
  submitLabel: string;
  error?: string;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="p-1"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        await onSubmit(name);
        setBusy(false);
      }}
    >
      <input
        autoFocus
        value={name}
        maxLength={VIEW_NAME_MAX}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className="hairline mb-1.5 block h-7 w-full rounded-[6px] bg-surface px-2 text-[13px] outline-none placeholder:text-ink-5"
      />
      {error && <p className="mb-1.5 text-[12px] text-[var(--red-ink)]">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="h-6 rounded-[6px] bg-accent px-2 text-[12px] font-medium text-accent-ink disabled:opacity-50"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
