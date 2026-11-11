/**
 * Sentry 1C: NotFound404 threw "No intl context found" when the 404 page was
 * rendered outside NextIntlClientProvider (e.g. `POST /`). It must render
 * with English fallback copy there and stay translated under a provider.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: Record<string, unknown>) => <img alt="" {...(props as object)} />,
}));

import { NotFound404 } from "@/components/pages/not-found-404";

describe("NotFound404", () => {
  it("renders fallback copy without an intl provider", () => {
    render(<NotFound404 />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("404");
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home Page" })).toHaveAttribute("href", "/");
  });

  it("uses the provider's messages when one is present", () => {
    render(
      <NextIntlClientProvider
        locale="ka"
        messages={{ notFound: { title: "404", subtitle: "გვერდი ვერ მოიძებნა", description: "აღწერა", homeButton: "მთავარი გვერდი" } }}
      >
        <NotFound404 />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("გვერდი ვერ მოიძებნა")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "მთავარი გვერდი" })).toBeInTheDocument();
  });
});
