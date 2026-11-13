/**
 * `EmployeeCount` — the one seat control of the product: any whole number
 * from 1, − / + by one, a typed integer, chips as shortcuts (never limits),
 * the "from 1 · change any time" hint; and `EmployeeStepper` (signup step 1)
 * which wraps it in its large form.
 */
import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import { EMPLOYEE_CHIPS, EmployeeCount } from "@/components/pricing/EmployeeCount";
import { EmployeeStepper } from "@/components/pricing/EmployeeStepper";

function Harness({
  initial = 1,
  onChange,
  locale = "en",
  large = false,
  stepper = false,
}: {
  initial?: number;
  onChange?: (n: number) => void;
  locale?: "en" | "ka";
  large?: boolean;
  stepper?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const set = (n: number) => {
    setValue(n);
    onChange?.(n);
  };
  const messages = (locale === "ka" ? ka : en) as Record<string, unknown>;
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {stepper ? (
        <EmployeeStepper value={value} onChange={set} />
      ) : (
        <EmployeeCount value={value} onChange={set} size={large ? "lg" : "md"} />
      )}
      <output data-testid="value">{value}</output>
    </NextIntlClientProvider>
  );
}

const input = () => screen.getByTestId("employee-count") as HTMLInputElement;
const value = () => screen.getByTestId("value").textContent;
const plus = () => screen.getByRole("button", { name: "More employees" });
const minus = () => screen.getByRole("button", { name: "Fewer employees" });

describe("EmployeeCount", () => {
  it("starts at the given value and steps by one, never below 1 and with no upper limit", () => {
    render(<Harness />);
    expect(input()).toHaveValue(1);
    expect(input()).toHaveAttribute("min", "1");
    expect(input()).toHaveAttribute("step", "1");
    expect(input()).not.toHaveAttribute("max");
    expect(minus()).toBeDisabled();
    fireEvent.click(plus());
    fireEvent.click(plus());
    expect(value()).toBe("3");
    fireEvent.click(minus());
    expect(value()).toBe("2");
    fireEvent.click(minus());
    expect(value()).toBe("1");
    expect(minus()).toBeDisabled();
    expect(plus()).not.toBeDisabled();
  });

  it("accepts a typed whole number of any size and commits it at once", () => {
    const spy = vi.fn();
    render(<Harness onChange={spy} />);
    fireEvent.change(input(), { target: { value: "7" } });
    expect(value()).toBe("7");
    fireEvent.change(input(), { target: { value: "1234" } });
    expect(value()).toBe("1234");
    expect(spy).toHaveBeenLastCalledWith(1234);
  });

  it("keeps the last value while the field is empty and repairs it on blur or Enter", () => {
    render(<Harness initial={4} />);
    fireEvent.change(input(), { target: { value: "" } });
    expect(value()).toBe("4");
    expect(input()).toHaveValue(null);
    fireEvent.blur(input());
    expect(input()).toHaveValue(1);
    expect(value()).toBe("1");

    fireEvent.change(input(), { target: { value: "0" } });
    expect(value()).toBe("1");
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(input()).toHaveValue(1);

    fireEvent.change(input(), { target: { value: "2.6" } });
    fireEvent.blur(input());
    expect(input()).toHaveValue(3);
    expect(value()).toBe("3");
  });

  it("offers 1 · 3 · 5 · 10 · 20 as shortcuts that do not cap the count", () => {
    render(<Harness />);
    expect([...EMPLOYEE_CHIPS]).toEqual([1, 3, 5, 10, 20]);
    const group = screen.getByRole("group", { name: "Quick picks" });
    expect(group).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("employee-chip-5"));
    expect(value()).toBe("5");
    expect(screen.getByTestId("employee-chip-5")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("employee-chip-20"));
    fireEvent.click(plus());
    expect(value()).toBe("21");
    expect(screen.getByTestId("employee-chip-20")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("employee-count-hint")).toHaveTextContent("From 1 employee. Change it any time.");
  });

  it("follows an external value change", () => {
    function Outer() {
      const [v, setV] = useState(2);
      return (
        <NextIntlClientProvider locale="en" messages={en as Record<string, unknown>}>
          <EmployeeCount value={v} onChange={setV} />
          <button type="button" onClick={() => setV(9)}>
            nine
          </button>
        </NextIntlClientProvider>
      );
    }
    render(<Outer />);
    fireEvent.click(screen.getByRole("button", { name: "nine" }));
    expect(input()).toHaveValue(9);
  });

  it("speaks Georgian with the seat word and no minimum", () => {
    const { container } = render(<Harness locale="ka" />);
    expect(screen.getByRole("button", { name: "მეტი თანამშრომელი" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ნაკლები თანამშრომელი" })).toBeInTheDocument();
    expect(screen.getByTestId("employee-count-hint")).toHaveTextContent("1 თანამშრომლიდან. შეცვლა ნებისმიერ დროს.");
    expect(container.textContent).not.toMatch(/მინიმუმ|50\+/);
  });
});

describe("EmployeeStepper (signup step 1)", () => {
  it("renders the heading, the seat word and the large control without a slider", () => {
    render(<Harness stepper initial={3} />);
    expect(screen.getByRole("heading", { level: 3, name: "How many people will log in?" })).toBeInTheDocument();
    expect(screen.getByText("employees")).toBeInTheDocument();
    expect(input()).toHaveValue(3);
    expect(screen.queryByRole("slider")).toBeNull();
    fireEvent.click(plus());
    expect(value()).toBe("4");
    fireEvent.change(input(), { target: { value: "250" } });
    expect(value()).toBe("250");
    expect(document.body.textContent).not.toMatch(/200|Minimum|contact/i);
  });
});
