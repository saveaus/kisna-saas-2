"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  EyeOff,
  ListFilter,
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn, initials } from "@/lib/cn";
import {
  Avatar,
  Button,
  MenuDivider,
  MenuItem,
  MenuLabel,
  Popover,
} from "@/components/ui/primitives";
import { TopBar } from "@/components/shell/top-bar";

/**
 * Reusable Lightfield-style table view: view tabs, chip filters, Display
 * menu, column menus, Create button, count footer. Every record list
 * (Clients, Sites, Staff, and later Prospects, Incidents…) uses this.
 */

export type Row = { id: number; name: string; [key: string]: unknown };

export type Column<T extends Row> = {
  key: string;
  label: string;
  icon?: LucideIcon;
  width?: number;
  /** Custom cell. Defaults to the raw value as text. */
  render?: (row: T) => ReactNode;
  /** Value used for search, filter and sort. Defaults to row[key]. */
  value?: (row: T) => string | number | undefined;
  /** Offer this column in the Filter menu with these choices. */
  filterOptions?: readonly string[];
  defaultHidden?: boolean;
};

export type Filter = { column: string; values: string[] };
export type View = { key: string; label: string; filters: Filter[] };

type Sort = { key: string; dir: "asc" | "desc" } | null;

function cellValue<T extends Row>(col: Column<T>, row: T) {
  if (col.value) return col.value(row);
  const raw = row[col.key];
  if (Array.isArray(raw)) return raw.join(", ");
  if (typeof raw === "string" || typeof raw === "number") return raw;
  return undefined;
}

function matchesFilter<T extends Row>(row: T, filter: Filter, col?: Column<T>) {
  if (!col || filter.values.length === 0) return true;
  if (filter.values.includes("__any__")) {
    const v = cellValue(col, row);
    return v !== undefined && v !== "";
  }
  const raw = col.value ? col.value(row) : row[col.key];
  const values = Array.isArray(raw) ? raw.map(String) : [String(raw ?? "")];
  return values.some((v) => filter.values.includes(v));
}

export function DataTable<T extends Row>({
  title,
  icon,
  noun,
  columns,
  rows,
  views = [],
  rowHref,
  onCreate,
}: {
  title: string;
  icon: LucideIcon;
  /** Singular noun for buttons, e.g. "client". */
  noun: string;
  columns: Column<T>[];
  rows: T[];
  views?: View[];
  rowHref?: (row: T) => string;
  onCreate?: () => void;
}) {
  const allViews: View[] = [{ key: "all", label: "All", filters: [] }, ...views];
  const [customViews, setCustomViews] = useState<View[]>([]);
  const [viewKey, setViewKey] = useState("all");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState<Sort>(null);
  const [order, setOrder] = useState(columns.map((c) => c.key));
  const [hidden, setHidden] = useState<Set<string>>(
    new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key)),
  );

  const byKey = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.key, c])),
    [columns],
  ) as Record<string, Column<T>>;

  const visible = order.filter((k) => !hidden.has(k)).map((k) => byKey[k]);
  const nameCol = visible[0];

  const views2 = [...allViews, ...customViews];
  const activeView = views2.find((v) => v.key === viewKey) ?? allViews[0];
  const activeFilters = useMemo(
    () => [...activeView.filters, ...filters],
    [activeView, filters],
  );

  const shown = useMemo(() => {
    let out = rows.filter((row) =>
      activeFilters.every((f) => matchesFilter(row, f, byKey[f.column])),
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((row) =>
        columns.some((c) =>
          String(cellValue(c, row) ?? "").toLowerCase().includes(q),
        ),
      );
    }
    if (sort) {
      const col = byKey[sort.key];
      out = [...out].sort((a, b) => {
        const av = cellValue(col, a) ?? "";
        const bv = cellValue(col, b) ?? "";
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, activeFilters, search, sort, byKey, columns]);

  const move = (key: string, dir: -1 | 1) => {
    setOrder((prev) => {
      const i = prev.indexOf(key);
      const j = i + dir;
      if (j < 1 || j >= prev.length) return prev; // name column stays first
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const hide = (key: string) =>
    setHidden((prev) => new Set(prev).add(key));

  const toggleHidden = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const addFilterValue = (column: string, value: string) => {
    setFilters((prev) => {
      const existing = prev.find((f) => f.column === column);
      if (!existing) return [...prev, { column, values: [value] }];
      const values = existing.values.includes(value)
        ? existing.values.filter((v) => v !== value)
        : [...existing.values, value];
      return prev
        .map((f) => (f.column === column ? { ...f, values } : f))
        .filter((f) => f.values.length > 0);
    });
  };

  const saveView = () => {
    const label = `View ${customViews.length + 1}`;
    const key = `custom-${customViews.length + 1}`;
    setCustomViews((prev) => [
      ...prev,
      { key, label, filters: [...activeFilters] },
    ]);
    setFilters([]);
    setViewKey(key);
  };

  const filterable = columns.filter((c) => c.filterOptions?.length);

  return (
    <div className="flex h-full flex-col">
      <TopBar
        icon={icon}
        title={title}
        actions={
          <>
            <Button variant="bare" icon={Upload} disabled title="Arrives in Step 3">
              Import CSV
            </Button>
            {onCreate && (
              <Button icon={Plus} onClick={onCreate}>
                Create {noun}
              </Button>
            )}
          </>
        }
      >
        <div className="flex items-center gap-1">
          {views2.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => {
                setViewKey(v.key);
                setFilters([]);
              }}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[6px] border-[0.5px] px-[7px] text-[12px] font-medium",
                v.key === viewKey
                  ? "border-line bg-hover text-ink"
                  : "border-transparent text-ink-3 hover:bg-hover",
              )}
            >
              <Table2 size={12} strokeWidth={1.75} />
              {v.label}
            </button>
          ))}
          <button
            type="button"
            onClick={saveView}
            disabled={activeFilters.length === 0 && filters.length === 0}
            title="Save the current filters as a view"
            className="flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </div>
      </TopBar>

      {/* Toolbar: search, filters, display */}
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-y-[0.5px] border-line px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen(!searchOpen)}
            className="hairline flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-2 hover:bg-hover"
          >
            <Search size={13} strokeWidth={1.75} />
          </button>
          {searchOpen && (
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Find in ${title.toLowerCase()}`}
              className="hairline h-6 w-48 rounded-[6px] bg-surface px-2 text-[12px] outline-none placeholder:text-ink-5"
            />
          )}

          {activeFilters.map((f, i) => {
            const col = byKey[f.column];
            const isOwn = i >= activeView.filters.length;
            return (
              <span
                key={`${f.column}-${i}`}
                className="hairline inline-flex h-6 items-center overflow-hidden rounded-[6px] bg-surface text-[12px] font-medium"
              >
                <span className="px-[7px] text-ink-2">{col?.label}</span>
                <span className="border-l-[0.5px] border-line px-[7px] text-ink-4">
                  is
                </span>
                <span className="border-l-[0.5px] border-line px-[7px] text-ink">
                  {f.values.includes("__any__")
                    ? "not empty"
                    : f.values.length > 1
                      ? `${f.values.length} values`
                      : f.values[0]}
                </span>
                {isOwn && (
                  <button
                    type="button"
                    aria-label="Remove filter"
                    onClick={() =>
                      setFilters((prev) =>
                        prev.filter((x) => x.column !== f.column),
                      )
                    }
                    className="flex h-full items-center border-l-[0.5px] border-line px-1.5 text-ink-3 hover:bg-hover"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            );
          })}

          <Popover
            width={240}
            trigger={({ toggle }) => (
              <Button variant="bare" icon={ListFilter} onClick={toggle}>
                Filter
              </Button>
            )}
          >
            <FilterMenu
              columns={filterable}
              filters={filters}
              onToggle={addFilterValue}
            />
          </Popover>
        </div>

        <Popover
          align="right"
          width={300}
          trigger={({ toggle }) => (
            <Button variant="ghost" icon={SlidersHorizontal} onClick={toggle}>
              Display
            </Button>
          )}
        >
          <div className="p-1">
            <div className="flex items-center justify-between gap-2 px-1 py-1">
              <span className="flex items-center gap-1.5 text-[13px] text-ink">
                <ArrowUpDown size={13} className="text-ink-3" /> Sorting
              </span>
              <div className="flex items-center gap-1">
                <select
                  value={sort?.key ?? ""}
                  onChange={(e) =>
                    setSort(
                      e.target.value
                        ? { key: e.target.value, dir: sort?.dir ?? "asc" }
                        : null,
                    )
                  }
                  className="hairline h-6 rounded-[6px] bg-surface px-1.5 text-[12px] outline-none"
                >
                  <option value="">None</option>
                  {columns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!sort}
                  onClick={() =>
                    sort &&
                    setSort({ ...sort, dir: sort.dir === "asc" ? "desc" : "asc" })
                  }
                  className="hairline flex h-6 w-6 items-center justify-center rounded-[6px] disabled:opacity-40"
                  aria-label="Flip sort direction"
                >
                  {sort?.dir === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                </button>
              </div>
            </div>
            <MenuDivider />
            <MenuLabel>Display properties</MenuLabel>
            <div className="flex flex-wrap gap-1 px-1 pb-1">
              {columns.slice(1).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleHidden(c.key)}
                  className={cn(
                    "h-6 rounded-[6px] border-[0.5px] px-[7px] text-[12px] font-medium",
                    hidden.has(c.key)
                      ? "border-line text-ink-4"
                      : "border-line bg-hover text-ink",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <MenuDivider />
            <div className="flex items-center justify-end gap-2 px-1 py-1">
              <Button
                variant="bare"
                onClick={() => {
                  setSort(null);
                  setOrder(columns.map((c) => c.key));
                  setHidden(
                    new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key)),
                  );
                }}
              >
                Reset
              </Button>
              <Button variant="bare" disabled title="Saved per workspace in Step 3">
                Save default for everyone
              </Button>
            </div>
          </div>
        </Popover>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto pb-36">
        <table className="w-max min-w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              {visible.map((col, i) => (
                <th
                  key={col.key}
                  className={cn(
                    "sticky top-0 z-10 h-11 border-b-[0.5px] border-r-[0.5px] border-line bg-canvas px-2 text-left font-normal",
                    i === 0 && "left-0 z-20 pl-4",
                  )}
                  style={{ minWidth: col.width ?? 140 }}
                >
                  <ColumnMenu
                    col={col}
                    sort={sort}
                    onSort={(dir) => setSort({ key: col.key, dir })}
                    onMove={(dir) => move(col.key, dir)}
                    onHide={i === 0 ? undefined : () => hide(col.key)}
                  />
                </th>
              ))}
              <th className="sticky top-0 h-11 w-full border-b-[0.5px] border-line bg-canvas" />
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id} className="group">
                {visible.map((col, i) => {
                  const content = col.render
                    ? col.render(row)
                    : (cellValue(col, row) ?? "");
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "h-11 border-b-[0.5px] border-r-[0.5px] border-line bg-canvas px-2 whitespace-nowrap group-hover:bg-[oklch(0.97_0_0)]",
                        i === 0 && "sticky left-0 z-[5] pl-4",
                      )}
                    >
                      {i === 0 && nameCol && rowHref ? (
                        <Link
                          href={rowHref(row)}
                          className="flex items-center gap-2 font-medium text-ink"
                        >
                          <Avatar label={initials(row.name)} />
                          <span className="underline-offset-2 hover:underline">
                            {row.name}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-ink">{content}</span>
                      )}
                    </td>
                  );
                })}
                <td className="border-b-[0.5px] border-line bg-canvas group-hover:bg-[oklch(0.97_0_0)]" />
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td
                  colSpan={visible.length + 1}
                  className="h-24 px-4 text-ink-4"
                >
                  No {title.toLowerCase()} match these filters.
                </td>
              </tr>
            )}
            <tr>
              <td className="sticky left-0 h-10 border-r-[0.5px] border-line bg-canvas pl-4 text-ink-4">
                {shown.length} count
              </td>
              <td colSpan={visible.length} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ColumnMenu<T extends Row>({
  col,
  sort,
  onSort,
  onMove,
  onHide,
}: {
  col: Column<T>;
  sort: Sort;
  onSort: (dir: "asc" | "desc") => void;
  onMove: (dir: -1 | 1) => void;
  onHide?: () => void;
}) {
  const Icon = col.icon;
  const sorted = sort?.key === col.key ? sort.dir : null;
  return (
    <Popover
      width={180}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="group/col flex h-6 w-full items-center gap-1.5 rounded-[6px] px-[7px] text-[13px] text-ink-4 hover:bg-hover"
        >
          {Icon && <Icon size={13} strokeWidth={1.75} className="shrink-0" />}
          <span className="truncate">{col.label}</span>
          {sorted &&
            (sorted === "asc" ? (
              <ArrowUp size={12} className="ml-auto" />
            ) : (
              <ArrowDown size={12} className="ml-auto" />
            ))}
          {!sorted && (
            <ChevronDown
              size={12}
              className="ml-auto opacity-0 group-hover/col:opacity-100"
            />
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem icon={ArrowUp} onClick={() => { onSort("asc"); close(); }}>
            Sort ascending
          </MenuItem>
          <MenuItem icon={ArrowDown} onClick={() => { onSort("desc"); close(); }}>
            Sort descending
          </MenuItem>
          <MenuDivider />
          <MenuItem icon={ArrowLeft} disabled={!onHide} onClick={() => { onMove(-1); close(); }}>
            Move left
          </MenuItem>
          <MenuItem icon={ArrowRight} disabled={!onHide} onClick={() => { onMove(1); close(); }}>
            Move right
          </MenuItem>
          <MenuItem icon={EyeOff} disabled={!onHide} onClick={() => { onHide?.(); close(); }}>
            Hide column
          </MenuItem>
        </>
      )}
    </Popover>
  );
}

function FilterMenu<T extends Row>({
  columns,
  filters,
  onToggle,
}: {
  columns: Column<T>[];
  filters: Filter[];
  onToggle: (column: string, value: string) => void;
}) {
  const [colKey, setColKey] = useState<string | null>(null);
  const col = columns.find((c) => c.key === colKey);

  if (!col) {
    return (
      <>
        <MenuLabel>Filter by</MenuLabel>
        {columns.map((c) => (
          <MenuItem key={c.key} icon={c.icon} onClick={() => setColKey(c.key)}>
            {c.label}
          </MenuItem>
        ))}
      </>
    );
  }

  const selected = filters.find((f) => f.column === col.key)?.values ?? [];
  return (
    <>
      <MenuItem icon={ArrowLeft} onClick={() => setColKey(null)}>
        {col.label}
      </MenuItem>
      <MenuDivider />
      {col.filterOptions!.map((opt) => (
        <MenuItem key={opt} onClick={() => onToggle(col.key, opt)}>
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "hairline flex h-3.5 w-3.5 items-center justify-center rounded-[4px]",
                selected.includes(opt) && "bg-ink text-white",
              )}
            >
              {selected.includes(opt) && <Check size={10} strokeWidth={3} />}
            </span>
            {opt}
          </span>
        </MenuItem>
      ))}
    </>
  );
}
