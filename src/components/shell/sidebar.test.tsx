import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "./sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/clients" }));
vi.mock("@/app/auth-actions", () => ({ signOutAction: async () => {} }));

const render = (hiddenHrefs: string[] = []) =>
  renderToStaticMarkup(
    <Sidebar
      workspaceName="Demo Provider"
      userName="Alex Morgan"
      roleLabel="Superadmin"
      hiddenHrefs={hiddenHrefs}
      canOpenSettings
    />,
  );

describe("Sidebar", () => {
  it("shows the daily sections and folded group names", () => {
    const html = render();
    for (const label of ["Up next", "Tasks", "Roster", "Clients", "Sites", "Staff"]) {
      expect(html).toContain(`>${label}<`);
    }
    for (const label of ["Operations", "Business", "Compliance", "Assistant"]) {
      expect(html).toContain(label);
    }
  });

  it("keeps folded items out of sight until opened", () => {
    const html = render();
    for (const label of ["Finance", "Incidents", "Policies", "Skills", "Suppliers"]) {
      expect(html).not.toContain(`>${label}<`);
    }
    expect(html.match(/aria-expanded="false"/g)?.length).toBe(4);
  });

  it("drops the old empty sections", () => {
    const html = render();
    for (const label of ["New chat", "New list", "Knowledge", "Lists"]) {
      expect(html).not.toContain(label);
    }
  });

  it("still hides pages this role can't open", () => {
    const html = render(["/sites", "/staff"]);
    expect(html).not.toContain(">Sites<");
    expect(html).not.toContain(">Staff<");
    expect(html).toContain(">Clients<");
  });

  it("marks the current page", () => {
    const link = (href: string) => render().match(new RegExp(`<a [^>]*href="${href}"[^>]*>`))?.[0];
    expect(link("/clients")).toContain("font-[450]");
    expect(link("/staff")).not.toContain("font-[450]");
  });
});
