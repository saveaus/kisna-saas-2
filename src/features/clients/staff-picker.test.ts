import { describe, expect, it } from "vitest";
import type { ClientRecord } from "@/lib/records";
import { buildStaffPicker } from "./staff-picker";

const base: ClientRecord = { id: 1, name: "Client", status: "Active" };
const options = [
  { id: 1, name: "Sam Lee" },
  { id: 2, name: "Sam Lee" },
  { id: 3, name: "Maya Chen" },
];

describe("buildStaffPicker", () => {
  it("only adds IDs to labels when two people share a name", () => {
    expect(buildStaffPicker(base, options).labels).toEqual(["Sam Lee (#1)", "Sam Lee (#2)", "Maya Chen"]);
    expect(buildStaffPicker(base, [{ id: 3, name: "Maya Chen" }]).labels).toEqual(["Maya Chen"]);
  });

  it("finds the right person from a label", () => {
    const { idFor } = buildStaffPicker(base, options);
    expect(idFor("Sam Lee (#2)")).toBe(2);
    expect(idFor("Sam Lee (#1)")).toBe(1);
    expect(idFor("Maya Chen")).toBe(3);
    expect(idFor("Nobody")).toBeUndefined();
    expect(idFor(undefined)).toBeUndefined();
  });

  it("matches current choices by ID, so the right Sam stays chosen", () => {
    const { record, idFor } = buildStaffPicker(
      {
        ...base,
        careManager: "Sam Lee",
        careManagerId: 2,
        preferredStaff: ["Sam Lee", "Maya Chen"],
        preferredStaffIds: ["1", "3"],
      },
      options,
    );
    expect(record.careManager).toBe("Sam Lee (#2)");
    expect(record.preferredStaff).toEqual(["Sam Lee (#1)", "Maya Chen"]);
    // Adding someone else keeps everyone already chosen: this used to drop Sam.
    const next = [...(record.preferredStaff as string[]), "Sam Lee (#2)"];
    expect(next.map(idFor)).toEqual([1, 3, 2]);
  });

  it("keeps someone who's no longer in the list", () => {
    const { record, idFor } = buildStaffPicker(
      { ...base, preferredStaff: ["Former Worker"], preferredStaffIds: ["99"], careManager: "Former Worker", careManagerId: 99 },
      options,
    );
    expect(record.preferredStaff).toEqual(["Former Worker"]);
    expect(record.careManager).toBe("Former Worker");
    expect(idFor("Former Worker")).toBe(99);
  });

  it("leaves names alone for someone who can't load the staff list", () => {
    const { record, labels } = buildStaffPicker({ ...base, careManager: "Assigned", careManagerId: 2 }, []);
    expect(record.careManager).toBe("Assigned");
    expect(labels).toEqual([]);
  });

  it("copes with no staff chosen", () => {
    const { record } = buildStaffPicker(base, options);
    expect(record.careManager).toBeUndefined();
    expect(record.preferredStaff).toBeUndefined();
  });
});
