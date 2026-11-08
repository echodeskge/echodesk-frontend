/** Templates moved from the main menu into Settings; old URLs redirect. */
import { describe, it, expect, vi } from "vitest";

const redirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));

import { navigationConfig } from "@/config/navigationConfig";
import TemplatesRedirect from "@/app/(tenant)/social/templates/page";
import CreateTemplateRedirect from "@/app/(tenant)/social/templates/create/page";

function ids(items: Array<{ id: string; children?: Array<{ id: string }> }>): string[] {
  return items.flatMap((i) => [i.id, ...(i.children ? ids(i.children) : [])]);
}

describe("templates navigation", () => {
  it("is a Settings child, not a top-level item", () => {
    const top = (navigationConfig as Array<{ id: string }>).map((i) => i.id);
    expect(top).not.toContain("social/templates");
    expect(ids(navigationConfig as never)).toContain("settings/templates");
  });

  it("redirects the old routes", () => {
    TemplatesRedirect();
    CreateTemplateRedirect();
    expect(redirect).toHaveBeenCalledWith("/settings/templates");
    expect(redirect).toHaveBeenCalledWith("/settings/templates/new");
  });
});
