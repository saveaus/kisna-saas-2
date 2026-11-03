import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StaffRecord } from "@/lib/records";
import { StaffRecordView } from "./staff-record";

vi.mock("./actions", () => ({}));
vi.mock("@/features/views/actions", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));

const worker: StaffRecord = {
  id: 5,
  name: "Jordan Hale",
  status: "Active",
  role: "Service Delivery Worker",
  employmentType: "Contractor",
  email: "jordan@example.com",
  phone: "0400 000 104",
  hasLogin: "No login",
};
const admin: StaffRecord = { ...worker, id: 1, name: "Alex Morgan", role: "Superadmin", hasLogin: "Linked" };

const render = (person: StaffRecord, props = {}) =>
  renderToStaticMarkup(
    <StaffRecordView
      person={person}
      canInvite={false}
      canEdit
      viewerIsSuperadmin
      viewerStaffId={1}
      {...props}
    />,
  );

const editable = (html: string, label: string) => html.includes(`aria-label="Edit ${label}"`);

describe("staff record", () => {
  it("is editable for a superadmin", () => {
    const html = render(worker);
    expect(editable(html, "Phone")).toBe(true);
    expect(editable(html, "Email")).toBe(true);
    expect(html).toContain("Set address…");
  });

  it("is read-only without Manage Users: full", () => {
    const html = render(worker, { canEdit: false, viewerIsSuperadmin: false });
    expect(editable(html, "Phone")).toBe(false);
    expect(html).toContain("Empty");
  });

  it("a manager can't edit a superadmin's record", () => {
    const html = render(admin, { viewerIsSuperadmin: false, viewerStaffId: 3 });
    expect(editable(html, "Phone")).toBe(false);
  });

  it("a manager can edit other staff", () => {
    const html = render(worker, { viewerIsSuperadmin: false, viewerStaffId: 3 });
    expect(editable(html, "Phone")).toBe(true);
  });

  it("someone's sign-in email can't be changed here", () => {
    expect(editable(render({ ...worker, hasLogin: "Linked" }), "Email")).toBe(false);
    expect(editable(render({ ...worker, hasLogin: "Linked" }), "Phone")).toBe(true);
  });

  it("nobody can change their own role or status, so they can't lock themselves out", () => {
    const own = render(admin, { viewerStaffId: 1 });
    expect(own).not.toContain("Set role");
    expect(editable(own, "Phone")).toBe(true);
    // Their role and status show as plain values rather than dropdowns.
    expect(own).toMatch(/Superadmin<\/span>/);
  });

  it("keeps the tab row short", () => {
    const html = render(worker);
    expect(html).toMatch(/>More<svg/);
    expect(html).not.toContain("</svg>Availability</button>");
  });
});
