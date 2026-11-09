import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import en from "@/i18n/messages/en.json";
import { SignalHigh } from "lucide-react";
import { FilterMenu } from "@/app/(tenant)/tickets/_components/toolbar/filter-menu";
import { renderIntl } from "../primitives/render";

const OPTIONS = [
  { value: "low", label: "Low" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

describe("FilterMenu (W1 verify)", () => {
  beforeAll(() => {
    // cmdk scrolls the active item into view; jsdom has no scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("two quick picks before the URL-backed `selected` updates keep both", () => {
    const onChange = vi.fn();
    renderIntl(
      <FilterMenu id="priority" icon={SignalHigh} label="Priority" options={OPTIONS} selected={[]} onChange={onChange} open onOpenChange={() => {}} searchable={false} />,
    );
    fireEvent.click(screen.getByText("High"));
    fireEvent.click(screen.getByText("Critical"));
    expect(onChange).toHaveBeenNthCalledWith(1, ["high"]);
    expect(onChange).toHaveBeenNthCalledWith(2, ["high", "critical"]);
    // Checked immediately, before the parent re-renders with the URL value.
    expect(document.querySelector('[data-option="critical"]')?.getAttribute("data-checked")).toBe("true");
  });

  it("follows the `selected` prop again once it changes", () => {
    const onChange = vi.fn();
    const props = { id: "priority", icon: SignalHigh, label: "Priority", options: OPTIONS, onChange, open: true, onOpenChange: () => {}, searchable: false };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Tbilisi">
        {children}
      </NextIntlClientProvider>
    );
    const { rerender } = render(<FilterMenu {...props} selected={[]} />, { wrapper });
    fireEvent.click(screen.getByText("High"));
    rerender(<FilterMenu {...props} selected={["low"]} />);
    expect(document.querySelector('[data-option="high"]')?.getAttribute("data-checked")).toBe("false");
    fireEvent.click(screen.getByText("Critical"));
    expect(onChange).toHaveBeenLastCalledWith(["low", "critical"]);
  });
});
