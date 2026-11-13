/**
 * Settings → Subscription → Employees card: current count, the shared
 * control, the live "new monthly total" from the catalogue prices × seats,
 * Save → PUT /api/subscription/agent-count/. Trial = free save; paid = the
 * proration (and payment link) the API answers with. Billing admins only.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";

const h = vi.hoisted(() => ({
  subscription: null as unknown,
  billingAdmin: true,
  update: vi.fn(),
  features: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: h.toast }));
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ isBillingAdmin: h.billingAdmin }) }));
vi.mock("@/hooks/api/useTenant", () => ({
  tenantKeys: { subscription: () => ["tenant", "subscription"] },
  useTenantSubscription: () => ({ data: h.subscription, isLoading: false }),
}));
vi.mock("@/api/generated/api", () => ({
  featuresList: h.features,
  subscriptionAgentCountUpdate: h.update,
}));

import { EmployeeCountCard } from "@/components/subscription/EmployeeCountCard";

const CATALOGUE = {
  results: [
    { id: 2, key: "user_management", name: "User management", price_per_user_gel: "1.00" },
    { id: 1, key: "ticket_management", name: "Tickets", price_per_user_gel: "9.00" },
    { id: 7, key: "social_integrations", name: "Inbox", price_per_user_gel: "19.00" },
  ],
};

const TRIAL = {
  has_subscription: true,
  is_trial: true,
  trial_ends_at: "2026-12-13T10:00:00Z",
  trial_days_remaining: 30,
  has_saved_card: false,
  subscription: { is_active: true, agent_count: 3, monthly_cost: 30, is_trial: true },
  selected_features: [
    { id: 2, key: "user_management", price_per_user_gel: 1 },
    { id: 1, key: "ticket_management", price_per_user_gel: 9 },
  ],
  features: {},
};

const PAID = {
  ...TRIAL,
  is_trial: false,
  subscription: { is_active: true, agent_count: 3, monthly_cost: 30, is_trial: false },
};

let qc: QueryClient;
function renderCard(locale: "en" | "ka" = "en") {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const messages = (locale === "ka" ? ka : en) as Record<string, unknown>;
  return render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <EmployeeCountCard />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const input = () => screen.getByTestId("employee-count") as HTMLInputElement;
const total = () => screen.getByTestId("employee-count-total").textContent?.replace(/\s+/g, " ").trim();
const save = () => screen.getByTestId("employee-count-save");

beforeEach(() => {
  vi.clearAllMocks();
  h.subscription = TRIAL;
  h.billingAdmin = true;
  h.features.mockResolvedValue(CATALOGUE);
});

describe("EmployeeCountCard", () => {
  it("shows the current count, the trial note and a live total; Save is off until the count changes", async () => {
    renderCard();
    expect(screen.getByTestId("employee-count-card")).toHaveTextContent("3 employees");
    expect(input()).toHaveValue(3);
    expect(screen.getByTestId("employee-count-note")).toHaveTextContent("changing the employee count is free");
    expect(save()).toBeDisabled();
    // (1 + 9) × 3 from the subscription's own prices, then the catalogue confirms them.
    expect(total()).toBe("New monthly total30 ₾ per month");
    await waitFor(() => expect(h.features).toHaveBeenCalled());
    expect(screen.getByText("10 ₾ per employee / month for your current modules")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More employees" }));
    expect(input()).toHaveValue(4);
    expect(total()).toBe("New monthly total40 ₾ per month");
    expect(save()).not.toBeDisabled();

    fireEvent.change(input(), { target: { value: "12" } });
    expect(total()).toBe("New monthly total120 ₾ per month");
    fireEvent.click(screen.getByTestId("employee-count-reset"));
    expect(input()).toHaveValue(3);
    expect(save()).toBeDisabled();
  });

  it("on trial: saves {agent_count: 4} and reports a free change, then refetches the subscription", async () => {
    h.update.mockResolvedValue({
      success: true,
      message: "Employee count updated from 3 to 4. Changes are free during the trial.",
      agent_count: 4,
      monthly_cost: 40,
      charged: false,
      is_trial: true,
      old_agent_count: 3,
      new_agent_count: 4,
      old_monthly_cost: 30,
      new_monthly_cost: 40,
    });
    renderCard();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    fireEvent.click(screen.getByRole("button", { name: "More employees" }));
    await act(async () => {
      fireEvent.click(save());
    });
    await waitFor(() => expect(h.update).toHaveBeenCalledWith({ agent_count: 4 }));
    const result = await screen.findByTestId("employee-count-result");
    expect(result).toHaveTextContent("Employee count set to 4. Free during the trial.");
    expect(result).toHaveTextContent("New monthly cost: 40 ₾");
    expect(result).not.toHaveTextContent("Charged now");
    expect(screen.queryByTestId("employee-count-pay")).toBeNull();
    expect(h.toast.success).toHaveBeenCalledWith("Employee count updated to 4 — free during the trial");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenant", "subscription"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["available-features"] });
  });

  it("on a paid plan: shows the proration the API answers with and a payment link when it sends one", async () => {
    h.subscription = PAID;
    h.update.mockResolvedValue({
      success: true,
      message: "Agent count updated from 3 to 5",
      agent_count: 5,
      monthly_cost: 50,
      charged: true,
      is_trial: false,
      old_agent_count: 3,
      new_agent_count: 5,
      old_monthly_cost: 30,
      new_monthly_cost: 50,
      prorated_difference: 13.33,
      days_remaining: 20,
      payment_url: "https://pay.example/order/1",
    });
    renderCard();
    expect(screen.getByTestId("employee-count-note")).toHaveTextContent("charged now");
    fireEvent.change(input(), { target: { value: "5" } });
    await act(async () => {
      fireEvent.click(save());
    });
    await waitFor(() => expect(h.update).toHaveBeenCalledWith({ agent_count: 5 }));
    const result = await screen.findByTestId("employee-count-result");
    expect(result).toHaveTextContent("Employee count set to 5.");
    expect(result).toHaveTextContent("New monthly cost: 50 ₾");
    expect(result).toHaveTextContent("Charged now for the 20 days left: 13.33 ₾");
    expect(screen.getByTestId("employee-count-pay")).toHaveTextContent("Complete payment");
    expect(h.toast.success).toHaveBeenCalledWith("Employee count updated to 5");
  });

  it("surfaces the API error and keeps the edited count", async () => {
    h.update.mockRejectedValue({ response: { data: { error: "Employee count must be a whole number of at least 1" } } });
    renderCard();
    fireEvent.change(input(), { target: { value: "9" } });
    await act(async () => {
      fireEvent.click(save());
    });
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith("Employee count must be a whole number of at least 1"));
    expect(input()).toHaveValue(9);
    expect(screen.queryByTestId("employee-count-result")).toBeNull();
  });

  it("floors a typed 0 to 1 before anything is sent", async () => {
    renderCard();
    fireEvent.change(input(), { target: { value: "0" } });
    fireEvent.blur(input());
    expect(input()).toHaveValue(1);
    expect(total()).toBe("New monthly total10 ₾ per month");
    await act(async () => {
      fireEvent.click(save());
    });
    await waitFor(() => expect(h.update).toHaveBeenCalledWith({ agent_count: 1 }));
  });

  it("hides the editor from non-billing admins and renders nothing without a subscription", () => {
    h.billingAdmin = false;
    renderCard();
    expect(screen.getByTestId("employee-count-readonly")).toHaveTextContent("Only billing admins");
    expect(screen.queryByTestId("employee-count")).toBeNull();
    expect(screen.getByTestId("employee-count-card")).toHaveTextContent("3 employees");

    h.billingAdmin = true;
    h.subscription = { has_subscription: false, features: {} };
    const { container } = renderCard();
    expect(container.querySelector('[data-testid="employee-count-card"]')).toBeNull();
  });

  it("speaks Georgian with the seat word", () => {
    renderCard("ka");
    expect(screen.getByTestId("employee-count-card")).toHaveTextContent("თანამშრომლები");
    expect(screen.getByTestId("employee-count-card")).toHaveTextContent("3 თანამშრომელი");
    expect(screen.getByTestId("employee-count-note")).toHaveTextContent("უფასო პერიოდში");
    expect(screen.getByRole("button", { name: "შენახვა" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/მინიმუმ 5|50\+/);
  });
});
