/**
 * Turns rows from the client_activity database function into the plain
 * sentences shown on a client's record.
 */
import { CLIENT_FIELDS } from "./fields";
import { CLIENT_COLUMNS } from "./records";

export type ActivityRow = {
  id: number;
  happened_at: string;
  actor_name: string;
  table_name: string;
  action: string;
  changed_fields: string[] | null;
  label: string | null;
};

const COLUMN_LABELS = new Map<string, string>([
  ...Object.entries(CLIENT_COLUMNS).map(
    ([key, column]): [string, string] => [column, CLIENT_FIELDS.find((f) => f.key === key)?.label ?? key],
  ),
  ["care_manager_id", "Care Manager"],
  ["scheduler_id", "Scheduler"],
]);

const MAX_FIELDS_NAMED = 3;

function listFields(columns: string[]) {
  const labels = columns.map((c) => COLUMN_LABELS.get(c) ?? c.replaceAll("_", " "));
  if (labels.length <= MAX_FIELDS_NAMED) return labels.join(", ");
  return `${labels.slice(0, MAX_FIELDS_NAMED).join(", ")} and ${labels.length - MAX_FIELDS_NAMED} more`;
}

export function describeActivity(row: ActivityRow) {
  const { table_name: table, action, label } = row;
  switch (table) {
    case "clients":
      if (action === "INSERT") return "Created this client";
      if (action === "DELETE") return "Deleted this client";
      return row.changed_fields?.length
        ? `Updated ${listFields(row.changed_fields)}`
        : "Updated this client";
    case "client_financials":
      return "Updated bank details";
    case "client_team":
      return "Updated the care team";
    case "client_notes":
      if (action === "INSERT") return "Added a note";
      if (action === "DELETE") return "Deleted a note";
      return "Edited a note";
    case "client_contacts": {
      const who = label ? `contact ${label}` : "a contact";
      if (action === "INSERT") return `Added ${who}`;
      if (action === "DELETE") return `Removed ${who}`;
      return `Updated ${who}`;
    }
    case "client_files": {
      const file = label ?? "a file";
      if (action === "DELETE") return `Deleted ${file}`;
      if (action === "UPDATE") return `Changed who can see ${file}`;
      return `Uploaded ${file}`;
    }
    default:
      return "Updated this client";
  }
}

const UNITS: [number, string][] = [
  [60 * 60 * 24 * 365, "year"],
  [60 * 60 * 24 * 30, "month"],
  [60 * 60 * 24 * 7, "week"],
  [60 * 60 * 24, "day"],
  [60 * 60, "hour"],
  [60, "minute"],
];

/** "5 minutes ago". Worked out on the server, so it can't differ from the browser's first paint. */
export function timeAgo(value: string | Date, now = new Date()) {
  const seconds = Math.floor((now.getTime() - new Date(value).getTime()) / 1000);
  for (const [size, name] of UNITS) {
    const count = Math.floor(seconds / size);
    if (count >= 1) return `${count} ${name}${count === 1 ? "" : "s"} ago`;
  }
  return "just now";
}
