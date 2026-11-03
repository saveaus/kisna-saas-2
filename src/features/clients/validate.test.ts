import { describe, expect, it } from "vitest";
import {
  cleanFileName,
  isClientFilePath,
  validateClientField,
  validateContact,
  validateNote,
  validateUpload,
} from "./validate";
import {
  CLIENT_FIELDS,
  clientFileType,
  clientTypeLevel,
  isFieldEditable,
  missingClientFields,
} from "@/lib/fields";
import { CLIENT_COLUMNS, CLIENT_FINANCIAL_COLUMNS, CONTACT_COLUMNS } from "@/lib/records";
import { clientContactExamples, clientFileExamples, clientNoteExamples, clients, staff } from "@/lib/demo-data";

const TODAY = new Date("2026-11-03T00:00:00Z");
const check = (key: string, value: Parameters<typeof validateClientField>[1]) =>
  validateClientField(key, value, TODAY);

describe("validateClientField", () => {
  it("trims text and turns empty into a cleared value", () => {
    expect(check("phone", "  0400 000 000 ")).toEqual({ ok: true, value: "0400 000 000" });
    expect(check("phone", "   ")).toEqual({ ok: true, value: undefined });
    expect(check("phone", undefined)).toEqual({ ok: true, value: undefined });
  });

  it("won't let required fields be emptied", () => {
    for (const key of ["name", "status", "fundingType"]) {
      expect(check(key, "").ok).toBe(false);
      expect(check(key, undefined).ok).toBe(false);
    }
  });

  it("only accepts listed options", () => {
    expect(check("fundingType", "NDIS").ok).toBe(true);
    expect(check("fundingType", "Cash").ok).toBe(false);
    expect(check("status", "Inactive").ok).toBe(true);
    expect(check("status", "Archived").ok).toBe(false);
    expect(check("classification", "Remote").ok).toBe(true);
    expect(check("gender", "Unknown").ok).toBe(false);
  });

  it("treats selects with no known options as free text", () => {
    expect(check("language", "Arabic")).toEqual({ ok: true, value: "Arabic" });
    expect(check("pensionStatus", "Full pension")).toEqual({ ok: true, value: "Full pension" });
  });

  it("checks email addresses", () => {
    expect(check("email", "a@example.com").ok).toBe(true);
    for (const bad of ["nope", "a b@example.com", "@example.com", "a@"]) {
      expect(check("email", bad).ok).toBe(false);
    }
  });

  it("checks dates, including ones that don't exist", () => {
    expect(check("startDate", "2026-02-28").ok).toBe(true);
    expect(check("startDate", "2026-02-31").ok).toBe(false);
    expect(check("startDate", "31/01/2026").ok).toBe(false);
    expect(check("startDate", "2030-01-01").ok).toBe(true);
  });

  it("won't accept a date of birth in the future", () => {
    expect(check("dateOfBirth", "1950-06-01").ok).toBe(true);
    expect(check("dateOfBirth", "2030-01-01").ok).toBe(false);
  });

  it("keeps percentages between 0 and 100, as numbers", () => {
    expect(check("everydayLiving", "12.5")).toEqual({ ok: true, value: 12.5 });
    expect(check("everydayLiving", 0)).toEqual({ ok: true, value: 0 });
    expect(check("everydayLiving", "101").ok).toBe(false);
    expect(check("everydayLiving", "-1").ok).toBe(false);
    expect(check("everydayLiving", "lots").ok).toBe(false);
  });

  it("cleans up lists, and clears them to an empty list", () => {
    expect(check("allergies", [" Peanuts ", "Latex", "Peanuts", " "])).toEqual({
      ok: true,
      value: ["Peanuts", "Latex"],
    });
    expect(check("allergies", undefined)).toEqual({ ok: true, value: [] });
    expect(check("allergies", "Peanuts").ok).toBe(false);
    expect(check("allergies", Array(51).fill(0).map((_, i) => `a${i}`)).ok).toBe(false);
  });

  it("refuses fields that can't be set this way", () => {
    for (const key of [
      "id",
      "workspace_id",
      "nope",
      "business",
      "compliance",
      "shiftNotesTemplate",
      "careManager",
      "preferredStaff",
      "constructor",
    ]) {
      expect(check(key, "x").ok).toBe(false);
    }
  });

  it("refuses lists for single-value fields, and limits length", () => {
    expect(check("phone", ["0400"]).ok).toBe(false);
    expect(check("name", "x".repeat(121)).ok).toBe(false);
    expect(check("reference", "x".repeat(501)).ok).toBe(false);
    expect(check("generalNotes", "x".repeat(5000)).ok).toBe(true);
    expect(check("generalNotes", "x".repeat(10001)).ok).toBe(false);
  });
});

describe("field definitions", () => {
  it("give every editable client field a database column", () => {
    const columns = { ...CLIENT_COLUMNS, ...CLIENT_FINANCIAL_COLUMNS };
    const missing = CLIENT_FIELDS.filter((f) => isFieldEditable(f) && f.type !== "relation")
      .map((f) => f.key)
      .filter((key) => !Object.hasOwn(columns, key));
    expect(missing).toEqual([]);
  });
});

describe("demo data", () => {
  const clientNames = clients.map((c) => c.name);

  it("notes are on real demo clients, by staff who can write them", () => {
    for (const note of clientNoteExamples) {
      expect(clientNames).toContain(note.client);
      expect(validateNote(note.body).ok).toBe(true);
      const role = staff.find((s) => s.name === note.author)?.role;
      expect(["Superadmin", "Service Manager"]).toContain(role);
    }
  });

  it("contacts are valid and on real demo clients", () => {
    for (const contact of clientContactExamples) {
      expect(clientNames).toContain(contact.client);
      expect(validateContact(contact).ok).toBe(true);
      expect(Object.keys(contact).filter((k) => k !== "client" && !Object.hasOwn(CONTACT_COLUMNS, k))).toEqual([]);
    }
  });

  it("files are allowed types on real demo clients", () => {
    for (const file of clientFileExamples) {
      expect(clientNames).toContain(file.client);
      expect(validateUpload({ name: file.name, size: file.body.length, type: "text/plain" }).ok).toBe(true);
    }
  });
});

describe("validateNote", () => {
  it("trims notes and refuses empty or oversized ones", () => {
    expect(validateNote("  Prefers mornings ")).toEqual({ ok: true, body: "Prefers mornings" });
    expect(validateNote("   ").ok).toBe(false);
    expect(validateNote(undefined).ok).toBe(false);
    expect(validateNote(42).ok).toBe(false);
    expect(validateNote("x".repeat(10001)).ok).toBe(false);
  });
});

describe("validateContact", () => {
  const good = { name: " Helen Doyle ", contactType: "Family", phone: " 0400 ", email: "" };

  it("cleans up a good contact", () => {
    expect(validateContact(good)).toEqual({
      ok: true,
      record: {
        name: "Helen Doyle",
        contactType: "Family",
        relationship: undefined,
        phone: "0400",
        email: undefined,
        notes: undefined,
      },
    });
  });

  it("needs a name and a known type", () => {
    expect(validateContact({ ...good, name: "  " }).ok).toBe(false);
    expect(validateContact({ ...good, contactType: undefined }).ok).toBe(false);
    expect(validateContact({ ...good, contactType: "Nemesis" }).ok).toBe(false);
  });

  it("checks the email and the lengths", () => {
    expect(validateContact({ ...good, email: "nope" }).ok).toBe(false);
    expect(validateContact({ ...good, phone: "1".repeat(41) }).ok).toBe(false);
    expect(validateContact({ ...good, notes: "x".repeat(2001) }).ok).toBe(false);
  });

  it("ignores anything that isn't a contact field", () => {
    const result = validateContact({ ...good, workspace_id: "other", client_id: 9 });
    expect(result.ok && Object.keys(result.record).sort()).toEqual(
      ["contactType", "email", "name", "notes", "phone", "relationship"].sort(),
    );
  });
});

describe("uploads", () => {
  it("accepts the allowed types, falling back to the extension", () => {
    expect(clientFileType("plan.pdf", "application/pdf")).toBe("application/pdf");
    expect(clientFileType("photo.HEIC", "")).toBe("image/heic");
    expect(clientFileType("list.csv", "")).toBe("text/csv");
  });

  it("refuses web pages, scripts and odd extensions", () => {
    expect(clientFileType("page.html", "text/html")).toBeUndefined();
    expect(clientFileType("logo.svg", "image/svg+xml")).toBeUndefined();
    expect(clientFileType("run.exe", "")).toBeUndefined();
    expect(clientFileType("noextension", "")).toBeUndefined();
    expect(clientFileType("x.constructor", "")).toBeUndefined();
  });

  it("checks size and type", () => {
    const pdf = { name: "plan.pdf", type: "application/pdf" };
    expect(validateUpload({ ...pdf, size: 1024 })).toEqual({
      ok: true,
      name: "plan.pdf",
      size: 1024,
      contentType: "application/pdf",
    });
    expect(validateUpload({ ...pdf, size: 25 * 1024 * 1024 }).ok).toBe(true);
    expect(validateUpload({ ...pdf, size: 25 * 1024 * 1024 + 1 }).ok).toBe(false);
    expect(validateUpload({ ...pdf, size: -1 }).ok).toBe(false);
    expect(validateUpload({ ...pdf, size: "1" }).ok).toBe(false);
    expect(validateUpload({ name: "page.html", type: "text/html", size: 1 }).ok).toBe(false);
    expect(validateUpload({ name: "", type: "application/pdf", size: 1 }).ok).toBe(false);
  });

  it("strips folders and control characters from names", () => {
    expect(cleanFileName("../../etc/passwd")).toBe("passwd");
    expect(cleanFileName("C:\\Users\\me\\plan.pdf")).toBe("plan.pdf");
    expect(cleanFileName("pl\u0000an\n.pdf")).toBe("plan.pdf");
    expect(cleanFileName(`${"x".repeat(300)}.pdf`).length).toBe(255);
    expect(cleanFileName(`${"x".repeat(300)}.pdf`).endsWith(".pdf")).toBe(true);
  });

  it("only accepts paths in this client's folder, with a random name", () => {
    const ws = "11111111-1111-1111-1111-111111111111";
    const id = "22222222-2222-4222-8222-222222222222";
    expect(isClientFilePath(`${ws}/7/${id}`, ws, 7)).toBe(true);
    expect(isClientFilePath(`${ws}/8/${id}`, ws, 7)).toBe(false);
    expect(isClientFilePath(`33333333-3333-3333-3333-333333333333/7/${id}`, ws, 7)).toBe(false);
    expect(isClientFilePath(`${ws}/7/../8/${id}`, ws, 7)).toBe(false);
    expect(isClientFilePath(`${ws}/7/plan.pdf`, ws, 7)).toBe(false);
    expect(isClientFilePath(undefined, ws, 7)).toBe(false);
  });
});

describe("missingClientFields", () => {
  const complete = {
    email: "a@example.com",
    phone: "0400",
    startDate: "2026-01-01",
    careManager: "Maya Chen",
    scheduler: "Sam Okonkwo",
  };

  it("is empty when everything's there", () => {
    expect(missingClientFields(complete)).toEqual([]);
  });

  it("lists what's missing by label", () => {
    expect(missingClientFields({ ...complete, phone: undefined, careManager: undefined })).toEqual([
      "Phone",
      "Care Manager",
    ]);
  });

  it("doesn't flag a care manager the viewer can't read the name of", () => {
    expect(missingClientFields({ ...complete, careManager: "Assigned" })).toEqual([]);
  });
});

describe("clientTypeLevel", () => {
  it("shows what applies to the funding type, even after it changes", () => {
    expect(clientTypeLevel({ fundingType: "NDIS", ndisType: "NDIS Plan Managed", level: "Level 2" })).toBe(
      "NDIS Plan Managed",
    );
    expect(clientTypeLevel({ fundingType: "HCP", ndisType: "NDIS Plan Managed", level: "Level 2" })).toBe("Level 2");
    expect(clientTypeLevel({ fundingType: "Private", ndisType: "x", level: "Level 2" })).toBeUndefined();
  });
});
