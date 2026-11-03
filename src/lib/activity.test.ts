import { describe, expect, it } from "vitest";
import { describeActivity, timeAgo, type ActivityRow } from "./activity";

const row = (over: Partial<ActivityRow>): ActivityRow => ({
  id: 1,
  happened_at: "2026-11-03T00:00:00Z",
  actor_name: "Maya Chen",
  table_name: "clients",
  action: "UPDATE",
  changed_fields: [],
  label: null,
  ...over,
});

describe("describeActivity", () => {
  it("names the client fields that changed, by their label", () => {
    expect(describeActivity(row({ changed_fields: ["phone", "date_of_birth"] }))).toBe(
      "Updated Phone, Date of Birth",
    );
    expect(describeActivity(row({ changed_fields: ["care_manager_id"] }))).toBe("Updated Care Manager");
  });

  it("shortens long lists", () => {
    expect(describeActivity(row({ changed_fields: ["phone", "email", "address", "gender", "language"] }))).toBe(
      "Updated Phone, Email, Address and 2 more",
    );
  });

  it("copes with a column it doesn't know", () => {
    expect(describeActivity(row({ changed_fields: ["brand_new_column"] }))).toBe("Updated brand new column");
    expect(describeActivity(row({ changed_fields: null }))).toBe("Updated this client");
    expect(describeActivity(row({ changed_fields: [] }))).toBe("Updated this client");
  });

  it("describes each kind of change", () => {
    expect(describeActivity(row({ action: "INSERT" }))).toBe("Created this client");
    expect(describeActivity(row({ table_name: "client_financials" }))).toBe("Updated bank details");
    expect(describeActivity(row({ table_name: "client_team", action: "INSERT" }))).toBe("Updated the care team");
    expect(describeActivity(row({ table_name: "client_notes", action: "INSERT" }))).toBe("Added a note");
    expect(describeActivity(row({ table_name: "client_notes", action: "UPDATE" }))).toBe("Edited a note");
    expect(describeActivity(row({ table_name: "client_notes", action: "DELETE" }))).toBe("Deleted a note");
    expect(describeActivity(row({ table_name: "client_files", action: "INSERT", label: "plan.pdf" }))).toBe(
      "Uploaded plan.pdf",
    );
    expect(describeActivity(row({ table_name: "client_files", action: "DELETE", label: "plan.pdf" }))).toBe(
      "Deleted plan.pdf",
    );
    expect(
      describeActivity(row({ table_name: "client_files", action: "UPDATE", label: "plan.pdf", changed_fields: ["shared_with_team"] })),
    ).toBe("Changed who can see plan.pdf");
    expect(describeActivity(row({ table_name: "client_contacts", action: "INSERT", label: "Helen" }))).toBe(
      "Added contact Helen",
    );
    expect(describeActivity(row({ table_name: "client_contacts", action: "DELETE" }))).toBe(
      "Removed a contact",
    );
    expect(describeActivity(row({ table_name: "something_new" }))).toBe("Updated this client");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  const ago = (seconds: number) => timeAgo(new Date(now.getTime() - seconds * 1000), now);

  it("rounds down to the largest whole unit", () => {
    expect(ago(0)).toBe("just now");
    expect(ago(59)).toBe("just now");
    expect(ago(60)).toBe("1 minute ago");
    expect(ago(60 * 5)).toBe("5 minutes ago");
    expect(ago(60 * 60)).toBe("1 hour ago");
    expect(ago(60 * 60 * 24)).toBe("1 day ago");
    expect(ago(60 * 60 * 24 * 8)).toBe("1 week ago");
    expect(ago(60 * 60 * 24 * 45)).toBe("1 month ago");
    expect(ago(60 * 60 * 24 * 400)).toBe("1 year ago");
  });

  it("treats a slightly fast clock as just now", () => {
    expect(ago(-30)).toBe("just now");
  });

  it("accepts the database's date text", () => {
    expect(timeAgo("2026-11-03T11:00:00+00:00", now)).toBe("1 hour ago");
  });
});
