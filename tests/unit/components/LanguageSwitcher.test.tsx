/**
 * LanguageSwitcher: switching the UI locale sets the cookie, refreshes, and
 * also (best effort) stores the user's notification language — a failing or
 * hanging profile PATCH must not block the switch.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const sync = vi.hoisted(() => vi.fn());
vi.mock("@/lib/preferredLanguage", () => ({ syncPreferredLanguage: sync }));

import { LanguageSwitcher } from "@/components/LanguageSwitcher";

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    refresh.mockReset();
    sync.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  it("stores the preferred language and switches the locale", async () => {
    // Never resolves: the switch must not wait for it.
    sync.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<LanguageSwitcher currentLocale="ka" />);

    await user.click(screen.getByRole("button", { name: /change language/i }));
    await user.click(await screen.findByText("English"));

    expect(sync).toHaveBeenCalledWith("en");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/set-locale",
      expect.objectContaining({ body: JSON.stringify({ locale: "en" }) })
    );
  });

  it("does nothing when the current locale is picked again", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher currentLocale="ka" />);

    await user.click(screen.getByRole("button", { name: /change language/i }));
    await user.click(await screen.findByText("ქართული"));

    expect(sync).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
