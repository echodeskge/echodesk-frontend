/**
 * Smoke tests for WhatsAppAccountSelect. (Radix Select options only mount when
 * opened, which jsdom can't drive via pointer capture, so we assert the trigger
 * renders with mocked status data and tolerates empty/undefined data.)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

let mockData: unknown;

vi.mock("@/hooks/api/useSocial", () => ({
  useWhatsAppStatus: () => ({ data: mockData }),
}));

import { WhatsAppAccountSelect } from "@/components/social/WhatsAppAccountSelect";

describe("WhatsAppAccountSelect", () => {
  beforeEach(() => {
    mockData = undefined;
  });

  it("renders a select trigger with account data", () => {
    mockData = {
      accounts: [
        { id: 1, waba_id: "waba1", business_name: "A", phone_number: "+1", display_phone_number: "+1", quality_rating: "GREEN", is_active: true },
        { id: 2, waba_id: "waba2", business_name: "B", phone_number: "+2", display_phone_number: "+2", quality_rating: "GREEN", is_active: false },
      ],
    };
    render(<WhatsAppAccountSelect value="waba1" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders without crashing when status is unavailable", () => {
    render(<WhatsAppAccountSelect value="" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
