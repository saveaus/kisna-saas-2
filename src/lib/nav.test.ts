import { describe, expect, it } from "vitest";
import { NAV } from "./nav";

const items = NAV.flatMap((g) => g.items);

describe("sidebar structure", () => {
  it("keeps every working page reachable", () => {
    const hrefs = items.flatMap((i) => (i.href ? [i.href] : []));
    expect(hrefs.sort()).toEqual(["/", "/clients", "/sites", "/staff"]);
  });

  it("starts short: the daily sections, in Imploy's order, then folded groups", () => {
    const open = NAV.filter((g) => g.defaultOpen ?? true);
    expect(open.flatMap((g) => g.items.map((i) => i.label))).toEqual([
      "Up next",
      "Tasks",
      "Roster",
      "Clients",
      "Sites",
      "Staff",
    ]);
    expect(NAV.filter((g) => g.label).map((g) => g.label)).toEqual([
      "Operations",
      "Business",
      "Compliance",
      "Assistant",
    ]);
  });

  it("says when every placeholder arrives", () => {
    expect(items.filter((i) => !i.href && !i.phase)).toEqual([]);
  });

  it("lists nothing twice", () => {
    const labels = items.map((i) => i.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("only has one group without a label, and it comes first", () => {
    expect(NAV.filter((g) => !g.label).length).toBe(1);
    expect(NAV[0].label).toBeUndefined();
  });
});
