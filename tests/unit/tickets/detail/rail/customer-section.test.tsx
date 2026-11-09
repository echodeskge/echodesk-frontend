/** FE-12 customer section (E23, DC36) and the chat-id helper. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";

const clientDetail = vi.hoisted(() => ({ value: null as unknown, enabled: [] as boolean[] }));
vi.mock("@/hooks/api/useSocialClients", () => ({
  useSocialClient: (_id: number, opts?: { enabled?: boolean }) => {
    clientDetail.enabled.push(opts?.enabled ?? true);
    return { data: opts?.enabled === false ? undefined : clientDetail.value, isLoading: false };
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { CustomerSection } from "@/app/(tenant)/tickets/[id]/_components/rail/customer-section";
import { chatIdForAccount, chatTargets } from "@/app/(tenant)/tickets/[id]/_components/rail/chat-links";
import { PERMS_ALL } from "../helpers";
import { renderRail } from "./rail-helpers";

const CUSTOMER = { id: 9, name: "Tamar Gelashvili", email: "tamar@example.ge", phone: "+995 599 12 34 56" };

const DETAIL = {
  id: 9,
  name: "Tamar Gelashvili",
  social_accounts: [
    { id: 1, platform: "whatsapp", platform_id: "+995599123456", account_connection_id: "waba1", display_name: "Tamar" },
    { id: 2, platform: "facebook", platform_id: "PSID7", account_connection_id: "page3", display_name: "Tamar G." },
    { id: 3, platform: "widget", platform_id: "visitor-1", account_connection_id: "4", display_name: null },
  ],
};

const links = () => Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-slot="customer-link"]'));

beforeEach(() => {
  clientDetail.value = DETAIL;
  clientDetail.enabled = [];
});

describe("CustomerSection", () => {
  it("renders only when the ticket has a customer and can_view_customer", () => {
    const { unmount } = renderRail(<CustomerSection customer={null} perms={PERMS_ALL} />);
    expect(screen.queryByTestId("customer-section")).toBeNull();
    unmount();
    renderRail(<CustomerSection customer={CUSTOMER} perms={{ ...PERMS_ALL, can_view_customer: false }} />);
    expect(screen.queryByTestId("customer-section")).toBeNull();
    expect(clientDetail.enabled.every((e) => e === false)).toBe(true);
  });

  it("avatar, name and the email · phone sub line (D190–D191)", () => {
    renderRail(<CustomerSection customer={CUSTOMER} perms={PERMS_ALL} />);
    const section = screen.getByTestId("customer-section");
    expect(section.className).toContain("p-3");
    expect(section.className).toContain("border-t");
    expect(section.className).toContain("gap-2.5");
    expect(section.querySelector('[data-slot="section-label"]')).toHaveTextContent("Customer");
    const avatar = section.querySelector('[data-slot="customer-avatar"]')!;
    expect(avatar).toHaveTextContent("TG");
    expect(avatar.className).toContain("size-9");
    expect(section.querySelector('[data-slot="customer-name"]')).toHaveTextContent("Tamar Gelashvili");
    expect(section).toHaveTextContent("tamar@example.ge · +995 599 12 34 56");
  });

  it("chat links with the platform name as meta, mailto, tel and Open client; no Calls row", () => {
    renderRail(<CustomerSection customer={CUSTOMER} perms={PERMS_ALL} />);
    const all = links();
    expect(all.map((a) => a.dataset.kind)).toEqual(["chat", "chat", "email", "phone", "client"]);
    expect(all[0]).toHaveAttribute("href", "/social/messages/wa_waba1_995599123456");
    expect(all[0]).toHaveTextContent("WhatsApp conversation");
    expect(all[0]).toHaveTextContent(/WhatsApp$/);
    expect(all[1]).toHaveAttribute("href", "/social/messages/fb_page3_PSID7");
    expect(all[1]).toHaveTextContent("Facebook");
    expect(all[2]).toHaveAttribute("href", "mailto:tamar@example.ge");
    expect(all[2]).toHaveTextContent("Email");
    expect(all[3]).toHaveAttribute("href", "tel:+995599123456");
    expect(all[4]).toHaveAttribute("href", "/social/clients?client=9");
    expect(all[4]).toHaveTextContent("Open client");
    expect(screen.queryByText(/calls/i)).toBeNull();
    for (const a of all) {
      expect(a.className).toContain("h-[30px]");
      expect(a.className).toContain("text-xs");
    }
  });

  it("ka: translated labels; brand names stay", () => {
    renderRail(<CustomerSection customer={CUSTOMER} perms={PERMS_ALL} />, { locale: "ka" });
    expect(screen.getByTestId("customer-section")).toHaveTextContent("კლიენტი");
    expect(links()[0]).toHaveTextContent("WhatsApp მიმოწერა");
    expect(links()[4]).toHaveTextContent("კლიენტის გახსნა");
  });

  it("no contact details: a muted line and only Open client", () => {
    clientDetail.value = { id: 9, name: "X", social_accounts: [] };
    renderRail(<CustomerSection customer={{ id: 9, name: "X", email: null, phone: "" }} perms={PERMS_ALL} />);
    expect(screen.getByText("No contact details")).toBeInTheDocument();
    expect(links().map((a) => a.dataset.kind)).toEqual(["client"]);
  });
});

describe("chat ids", () => {
  it("mirror the backend composite ids; widget and unknown platforms get none", () => {
    expect(chatIdForAccount({ id: 1, platform: "instagram", platform_id: "IG1", account_connection_id: "c" })).toBe("ig_c_IG1");
    expect(chatIdForAccount({ id: 1, platform: "email", platform_id: "a@b.ge", account_connection_id: "7" })).toBe("email_7_a@b.ge");
    expect(chatIdForAccount({ id: 1, platform: "widget", platform_id: "v", account_connection_id: "4" })).toBeNull();
    expect(chatIdForAccount({ id: 1, platform: "telegram", platform_id: "t", account_connection_id: "4" })).toBeNull();
    expect(chatIdForAccount({ id: 1, platform: "facebook", platform_id: "", account_connection_id: "4" })).toBeNull();
    expect(chatIdForAccount({ id: 1, platform: "widget", chat_id: "widget_4_s1" })).toBe("widget_4_s1");
  });

  it("chatTargets drops duplicates and unresolvable accounts", () => {
    const targets = chatTargets([
      ...DETAIL.social_accounts,
      { id: 9, platform: "whatsapp", platform_id: "995599123456", account_connection_id: "waba1" },
    ]);
    expect(targets.map((t) => t.chatId)).toEqual(["wa_waba1_995599123456", "fb_page3_PSID7"]);
  });
});
