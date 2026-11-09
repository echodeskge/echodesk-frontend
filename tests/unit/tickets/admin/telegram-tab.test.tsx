import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("next-intl", async () => {
  const { translate } = await import("./test-utils");
  return { useTranslations: (ns: string) => translate(ns) };
});

import axios from "@/api/axios";
import * as generated from "@/api/generated/api";
import { TelegramTab } from "@/components/tickets-admin/telegram-tab";
import { HttpError, renderWithClient, routeAxios, type Routes } from "./test-utils";

const ax = axios as unknown as Parameters<typeof routeAxios>[0];
const T = "tickets.boardAdmin.telegram";
const URL = "/api/boards/3/telegram-connection/";

const conn = { id: 1, board: 3, chat_id: "-100123", is_active: true, has_token: true };

function setup(routes: Routes, canEdit = true) {
  routeAxios(ax, routes);
  return renderWithClient(<TelegramTab boardId={3} canEdit={canEdit} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TelegramTab", () => {
  it("shows the connected badge, the saved chat id and a write-only token field", async () => {
    setup({ [`GET ${URL}`]: conn });
    expect(await screen.findByTestId("telegram-status")).toHaveTextContent(`${T}.connected`);
    expect(screen.getByLabelText(`${T}.chatId`)).toHaveValue("-100123");
    const token = screen.getByLabelText(`${T}.botToken`);
    expect(token).toHaveValue("");
    expect(token).toHaveAttribute("type", "password");
    expect(token).toHaveAttribute("placeholder", `${T}.botTokenKeep`);
    expect(screen.getByRole("switch")).toBeChecked();
    // Inline help
    expect(screen.getByText(`${T}.help.title`)).toBeInTheDocument();
    expect(screen.getByText(`${T}.help.step3`)).toBeInTheDocument();
  });

  it("updates with PUT and keeps the token when the field is left empty", async () => {
    const user = userEvent.setup();
    const put = vi.fn(() => ({ ...conn, is_active: false }));
    setup({ [`GET ${URL}`]: conn, [`PUT ${URL}`]: put });
    await screen.findByTestId("telegram-status");

    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: `${T}.save` }));
    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put.mock.calls[0][0]).toEqual({ chat_id: "-100123", is_active: false });
    expect(toastMock.success).toHaveBeenCalledWith(`${T}.saved`);
  });

  it("sends a new token on update when one is typed", async () => {
    const user = userEvent.setup();
    const put = vi.fn(() => conn);
    setup({ [`GET ${URL}`]: conn, [`PUT ${URL}`]: put });
    await screen.findByTestId("telegram-status");
    await user.type(screen.getByLabelText(`${T}.botToken`), "123:abc");
    await user.click(screen.getByRole("button", { name: `${T}.save` }));
    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put.mock.calls[0][0]).toEqual({ chat_id: "-100123", is_active: true, bot_token_raw: "123:abc" });
  });

  it("creates with POST when not connected and requires a token", async () => {
    const user = userEvent.setup();
    const post = vi.fn(() => conn);
    setup({ [`GET ${URL}`]: () => new HttpError(404), [`POST ${URL}`]: post });
    expect(await screen.findByTestId("telegram-status")).toHaveTextContent(`${T}.notConnected`);
    expect(screen.queryByRole("button", { name: `${T}.disconnect` })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(`${T}.chatId`), "-42");
    await user.click(screen.getByRole("button", { name: `${T}.save` }));
    expect(await screen.findByRole("alert")).toHaveTextContent(`${T}.botTokenRequired`);
    expect(post).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(`${T}.botToken`), "tok");
    await user.click(screen.getByRole("button", { name: `${T}.save` }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][0]).toEqual({ chat_id: "-42", is_active: true, bot_token_raw: "tok" });
    expect(await screen.findByTestId("telegram-status")).toHaveTextContent(`${T}.connected`);
  });

  it("requires a chat id", async () => {
    const user = userEvent.setup();
    setup({ [`GET ${URL}`]: () => new HttpError(404) });
    await screen.findByTestId("telegram-status");
    await user.type(screen.getByLabelText(`${T}.botToken`), "tok");
    await user.click(screen.getByRole("button", { name: `${T}.save` }));
    expect(await screen.findByRole("alert")).toHaveTextContent(`${T}.chatIdRequired`);
  });

  it("sends a test message and reports failure", async () => {
    const user = userEvent.setup();
    const test = vi.fn(() => ({ status: "ok", message: "sent" }));
    setup({ [`GET ${URL}`]: conn, [`POST ${URL}test/`]: test });
    await screen.findByTestId("telegram-status");
    await user.click(screen.getByRole("button", { name: `${T}.test` }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(`${T}.testOk`));
    expect(test.mock.calls[0][0]).toEqual({ chat_id: "-100123" });

    test.mockImplementation(() => new HttpError(400, { status: "error" }) as never);
    await user.click(screen.getByRole("button", { name: `${T}.test` }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(`${T}.testFail`));
  });

  it("disconnects", async () => {
    const user = userEvent.setup();
    const del = vi.fn(() => null);
    setup({ [`GET ${URL}`]: conn, [`DELETE ${URL}`]: del });
    await screen.findByTestId("telegram-status");
    await user.click(screen.getByRole("button", { name: `${T}.disconnect` }));
    await waitFor(() => expect(del).toHaveBeenCalled());
    expect(await screen.findByTestId("telegram-status")).toHaveTextContent(`${T}.notConnected`);
    expect(toastMock.success).toHaveBeenCalledWith(`${T}.disconnected`);
  });

  it("hides the write actions without edit rights", async () => {
    setup({ [`GET ${URL}`]: conn }, false);
    await screen.findByTestId("telegram-status");
    expect(screen.queryByRole("button", { name: `${T}.save` })).not.toBeInTheDocument();
    expect(screen.getByLabelText(`${T}.chatId`)).toBeDisabled();
  });

  it("uses the generated boardsTelegramConnection* functions, not raw axios", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../../../src/components/tickets-admin/telegram-tab.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/@\/api\/axios|from ["']axios["']/);
    for (const fn of [
      "boardsTelegramConnectionRetrieve",
      "boardsTelegramConnectionCreate",
      "boardsTelegramConnectionUpdate",
      "boardsTelegramConnectionDestroy",
      "boardsTelegramConnectionTestCreate",
    ]) {
      expect(src).toContain(fn);
      expect(typeof (generated as Record<string, unknown>)[fn]).toBe("function");
    }
  });
});
