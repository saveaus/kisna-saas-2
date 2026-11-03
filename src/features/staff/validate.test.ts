import { describe, expect, it } from "vitest";
import { STAFF_FIELDS, isFieldEditable } from "@/lib/fields";
import { STAFF_COLUMNS } from "@/lib/records";
import { validateStaffField } from "./validate";

const TODAY = new Date("2026-11-03T00:00:00Z");
const check = (key: string, value: Parameters<typeof validateStaffField>[1]) =>
  validateStaffField(key, value, TODAY);

describe("validateStaffField", () => {
  it("every editable staff field has a database column", () => {
    const missing = STAFF_FIELDS.filter((f) => isFieldEditable(f) && f.type !== "relation")
      .map((f) => f.key)
      .filter((key) => !Object.hasOwn(STAFF_COLUMNS, key));
    expect(missing).toEqual([]);
  });

  it("won't let Imploy's required fields be emptied", () => {
    for (const key of ["name", "status", "email", "phone", "address", "role", "employmentType", "dateOfBirth"]) {
      expect(check(key, "").ok).toBe(false);
    }
  });

  it("only accepts real roles, statuses and employment types", () => {
    expect(check("role", "Service Manager").ok).toBe(true);
    expect(check("role", "Owner").ok).toBe(false);
    expect(check("status", "Inactive").ok).toBe(true);
    expect(check("status", "Fired").ok).toBe(false);
    expect(check("employmentType", "Contractor").ok).toBe(true);
    expect(check("employmentType", "Volunteer").ok).toBe(false);
  });

  it("checks emails and dates", () => {
    expect(check("email", "a@example.com").ok).toBe(true);
    expect(check("email", "nope").ok).toBe(false);
    expect(check("dateOfBirth", "1990-01-01").ok).toBe(true);
    expect(check("dateOfBirth", "2030-01-01").ok).toBe(false);
  });

  it("clears lists to an empty list, which the database requires", () => {
    expect(check("nationality", undefined)).toEqual({ ok: true, value: [] });
    expect(check("nationality", [" Australian ", "Greek"])).toEqual({ ok: true, value: ["Australian", "Greek"] });
  });

  it("allows optional fields to be cleared", () => {
    expect(check("preferredName", "")).toEqual({ ok: true, value: undefined });
    expect(check("ecName", "")).toEqual({ ok: true, value: undefined });
  });

  it("refuses fields that can't be set by hand", () => {
    for (const key of ["employeeId", "age", "accessBusiness", "payGroup", "id", "user_id", "workspace_id", "nope"]) {
      expect(check(key, "x").ok).toBe(false);
    }
  });
});
