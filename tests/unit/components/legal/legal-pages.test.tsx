/**
 * Public legal pages Meta's app review looks at:
 *  - /data-deletion: deletion instructions in both languages, in the
 *    server-rendered markup (the inactive language is `hidden`, not absent);
 *  - /privacy-policy: markdown read on the server (no client fetch), with the
 *    Facebook / Instagram / Messenger section in both languages;
 *  - the landing footer links the deletion page.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import en from "@/i18n/messages/en.json";

vi.mock("@/lib/seo-metadata", () => ({ buildSeoMetadata: vi.fn() }));

import DataDeletionPage from "@/app/data-deletion/page";
import PrivacyPolicyPage from "@/app/privacy-policy/page";
import { Footer } from "@/components/landing/Footer";
import { ConsentProvider } from "@/lib/consent";

describe("/data-deletion", () => {
  it("server-renders both languages with the deletion steps", () => {
    const html = renderToStaticMarkup(<DataDeletionPage />);
    expect(html).toContain("Facebook &amp; Instagram Data Deletion");
    expect(html).toContain("Apps and Websites");
    expect(html).toContain("support@echodesk.ge");
    expect(html).toContain("30 days");
    expect(html).toContain("Checking the status of a request");
    // Georgian version is in the HTML too (hidden until toggled).
    expect(html).toContain("Facebook-ისა და Instagram-ის მონაცემების წაშლა");
  });

  it("shows English first and toggles to Georgian", async () => {
    const user = userEvent.setup();
    render(<DataDeletionPage />);
    expect(screen.getByTestId("data-deletion-en")).toBeVisible();
    expect(screen.getByTestId("data-deletion-ka")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "ქართული" }));
    expect(screen.getByTestId("data-deletion-ka")).toBeVisible();
    expect(screen.getByTestId("data-deletion-en")).not.toBeVisible();
  });
});

describe("/privacy-policy", () => {
  it("server-renders the policy text, including the Meta section, without fetching", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const html = renderToStaticMarkup(<PrivacyPolicyPage />);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();

    expect(html).toContain("PRIVACY POLICY");
    expect(html).toContain("Facebook, Instagram and Messenger");
    expect(html).toContain("HUMAN_AGENT");
    expect(html).toContain("only when the business enables");
    expect(html).toContain('href="/data-deletion"');
    expect(html).toContain("Facebook, Instagram და Messenger");
  });

  it("toggles between Georgian (default) and English", async () => {
    const user = userEvent.setup();
    render(<PrivacyPolicyPage />);
    expect(screen.getByTestId("privacy-ka")).toBeVisible();
    expect(screen.getByTestId("privacy-en")).not.toBeVisible();
    await user.click(screen.getByRole("button", { name: "English" }));
    const enArticle = screen.getByTestId("privacy-en");
    expect(enArticle).toBeVisible();
    expect(within(enArticle).getByRole("heading", { name: "Facebook, Instagram and Messenger" })).toBeInTheDocument();
  });
});

describe("landing footer", () => {
  it("links the data deletion page", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ConsentProvider>
          <Footer />
        </ConsentProvider>
      </NextIntlClientProvider>
    );
    expect(screen.getByRole("link", { name: "Data Deletion" })).toHaveAttribute("href", "/data-deletion");
  });
});
