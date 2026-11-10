/**
 * TransferPanel + useTransferAgents: agents from phone assignments + live
 * extension status (own user excluded, offline disabled), 15 s refresh while
 * open, attended vs blind, the external number input, load failure.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type { CallActionsValue, CallStateValue } from "@/contexts/call-types";

const h = vi.hoisted(() => ({
  state: null as unknown as CallStateValue,
  actions: null as unknown as CallActionsValue,
  phoneAssignmentsList: vi.fn(),
  extensionsStatusRetrieve: vi.fn(),
}));

vi.mock("@/contexts/CallContext", () => ({
  useCallState: () => h.state,
  useCallActions: () => h.actions,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: 1, is_staff: true } }) }));
vi.mock("@/api/generated/api", () => ({
  phoneAssignmentsList: h.phoneAssignmentsList,
  extensionsStatusRetrieve: h.extensionsStatusRetrieve,
}));

import { TransferPanel } from "@/components/calls/rail/transfer-panel";
import { TRANSFER_AGENTS_REFRESH_MS, buildTransferAgents } from "@/components/calls/rail/use-transfer-agents";
import { makeActions, makeActiveCall, makeState, renderWithProviders } from "./rail-test-utils";

const assignments = {
  count: 3,
  results: [
    { id: 1, user: 1, user_name: "Me", extension: "100", phone_number: "" },
    { id: 2, user: 2, user_name: "Ana Lomidze", extension: "102", phone_number: "" },
    { id: 3, user: 3, user_name: "", extension: "103", phone_number: "" },
  ],
};
const extStatus = { extensions: [{ extension: "102", status: "online" }, { extension: "103", status: "offline" }] };

beforeEach(() => {
  h.state = makeState({ activeCall: makeActiveCall() });
  h.actions = makeActions();
  h.phoneAssignmentsList.mockResolvedValue(assignments);
  h.extensionsStatusRetrieve.mockResolvedValue(extStatus);
});

function renderPanel() {
  const onDone = vi.fn();
  const utils = renderWithProviders(<TransferPanel onDone={onDone} />);
  return { ...utils, onDone };
}

describe("useTransferAgents", () => {
  it("queries active assignments and the extension status", async () => {
    renderPanel();
    await screen.findAllByTestId("call-rail-transfer-agent");
    expect(h.phoneAssignmentsList).toHaveBeenCalledWith(true);
    expect(h.extensionsStatusRetrieve).toHaveBeenCalledTimes(1);
  });

  it("refreshes every 15 s while the panel is open (U6)", async () => {
    const { queryClient } = renderPanel();
    await screen.findAllByTestId("call-rail-transfer-agent");
    const query = queryClient.getQueryCache().find({ queryKey: ["calls", "transfer-agents"] });
    const observer = query?.observers[0];
    expect(TRANSFER_AGENTS_REFRESH_MS).toBe(15_000);
    expect(observer?.options.refetchInterval).toBe(15_000);
    expect(observer?.options.staleTime).toBe(15_000);
  });

  it("buildTransferAgents excludes the own user, labels nameless agents by extension and marks online", () => {
    const agents = buildTransferAgents(
      { assignments: assignments.results as never, onlineExtensions: ["102"] },
      1,
      (ext) => `ext ${ext}`
    );
    expect(agents).toEqual([
      { id: 2, userId: 2, name: "Ana Lomidze", extension: "102", phone: "", online: true },
      { id: 3, userId: 3, name: "ext 103", extension: "103", phone: "", online: false },
    ]);
  });
});

describe("TransferPanel", () => {
  it("lists agents (own user excluded) with online state; offline agents are disabled", async () => {
    renderPanel();
    expect(screen.getByText("Transfer to agent")).toBeInTheDocument();
    const rows = await screen.findAllByTestId("call-rail-transfer-agent");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Ana Lomidze");
    expect(rows[0]).toHaveTextContent("ext 102");
    expect(rows[0]).toHaveAttribute("data-online", "true");
    expect(rows[0].className).toContain("h-8");
    expect(rows[0].querySelector(".bg-ed-green")).not.toBeNull();
    expect(rows[0]).toBeEnabled();
    expect(rows[1]).toHaveAttribute("data-online", "false");
    expect(rows[1]).toBeDisabled();
    expect(screen.queryByText("Me")).toBeNull();
  });

  it("attended (default) starts a consultation with the agent and closes the panel", async () => {
    const user = userEvent.setup();
    const { onDone } = renderPanel();
    expect(screen.getByRole("radio", { name: "Attended" })).toHaveAttribute("aria-checked", "true");
    await user.click((await screen.findAllByTestId("call-rail-transfer-agent"))[0]);
    expect(h.actions.startAttendedTransfer).toHaveBeenCalledWith("102", "Ana Lomidze");
    expect(h.actions.transferCall).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("blind transfers straight to the agent", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId("call-rail-transfer-blind"));
    await user.click((await screen.findAllByTestId("call-rail-transfer-agent"))[0]);
    expect(h.actions.transferCall).toHaveBeenCalledWith("102");
    expect(h.actions.startAttendedTransfer).not.toHaveBeenCalled();
  });

  it("swallows a rejected transfer (CallContext reports it through error)", async () => {
    const user = userEvent.setup();
    h.actions = makeActions({ startAttendedTransfer: vi.fn().mockRejectedValue(new Error("nope")) });
    const { onDone } = renderPanel();
    await user.click((await screen.findAllByTestId("call-rail-transfer-agent"))[0]);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("shows the empty message when nobody has a phone, and the error when the list fails", async () => {
    h.phoneAssignmentsList.mockResolvedValue({ count: 0, results: [] });
    const first = renderPanel();
    expect(await screen.findByText("No agents with phone assignments")).toBeInTheDocument();
    first.unmount();

    h.phoneAssignmentsList.mockRejectedValue(new Error("boom"));
    renderPanel();
    expect(await screen.findByTestId("call-rail-transfer-error")).toHaveTextContent("Couldn't load the agents");
  });

  it("a failing status endpoint just marks everyone offline", async () => {
    h.extensionsStatusRetrieve.mockRejectedValue(new Error("no sidecar"));
    renderPanel();
    const rows = await screen.findAllByTestId("call-rail-transfer-agent");
    expect(rows.every((r) => r.getAttribute("data-online") === "false")).toBe(true);
  });

  it("transfers to an external number (button and Enter), keeping dial characters only", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId("call-rail-transfer-blind"));
    await user.click(screen.getByText("Transfer to a number"));
    expect(screen.getByTestId("call-rail-transfer-submit")).toBeDisabled();
    await user.type(screen.getByTestId("call-rail-transfer-number"), "555-000");
    expect(screen.getByTestId("call-rail-transfer-number")).toHaveValue("555000");
    await user.click(screen.getByTestId("call-rail-transfer-submit"));
    expect(h.actions.transferCall).toHaveBeenCalledWith("555000");

    await user.type(screen.getByTestId("call-rail-transfer-number"), "777{Enter}");
    await waitFor(() => expect(h.actions.transferCall).toHaveBeenCalledWith("777"));
  });
});
