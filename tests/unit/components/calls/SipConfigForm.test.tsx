/**
 * SipConfigForm on the settings kit: FieldRow inputs with labels, SecretInput
 * for the trunk and TURN passwords (never prefilled: only `has_password`
 * decides the hint), toggles for Active / Default, submit rules, ka strings.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";
import { cl03Messages, lookup } from "../../calls/cl03-i18n";
import { SipConfigForm, type SipConfigFormValues } from "@/components/calls/SipConfigForm";
import type { SipConfigurationDetail } from "@/api/generated/interfaces";

const detail: SipConfigurationDetail = {
  id: 1,
  name: "Demo PBX",
  sip_server: "pbx.demo.invalid",
  sip_port: 8089,
  username: "demo-trunk",
  password: "",
  realm: "",
  proxy: "",
  phone_number: "+995322000111",
  websocket_path: "/ws",
  stun_server: "",
  turn_server: "turn:turn.demo.invalid:3478",
  turn_username: "turnuser",
  turn_password: "",
  has_password: true,
  has_turn_password: false,
  is_active: true,
  is_default: true,
  max_concurrent_calls: 9,
  user_assignments: [],
};

const update = vi.fn();
const onSave = vi.fn().mockResolvedValue(undefined);
const onClose = vi.fn();

function renderForm(configForm: SipConfigFormValues, editingConfig: SipConfigurationDetail | null = null, locale: "en" | "ka" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={cl03Messages[locale]}>
      <SipConfigForm open onClose={onClose} onSave={onSave} configForm={configForm} updateFormField={update} editingConfig={editingConfig} saving={false} />
    </NextIntlClientProvider>
  );
}

const editValues: SipConfigFormValues = { ...detail, password: "", turn_password: "" };

beforeEach(() => {
  update.mockClear();
  onSave.mockClear();
  onClose.mockClear();
});

describe("SipConfigForm", () => {
  it("renders the kit rows with labelled inputs and forwards edits through updateFormField", () => {
    renderForm({ name: "", sip_server: "", sip_port: 5060, username: "", is_active: true, is_default: false, max_concurrent_calls: 5 });
    const dialog = screen.getByTestId("sip-config-form");
    expect(within(dialog).getByTestId("sip-form-connection")).toBeInTheDocument();
    expect(within(dialog).getByTestId("sip-form-credentials")).toBeInTheDocument();
    expect(within(dialog).getByTestId("sip-form-webrtc")).toBeInTheDocument();
    expect(within(dialog).getByTestId("sip-form-status")).toBeInTheDocument();
    // no shadcn Input / Checkbox left: kit 34px inputs and switches
    expect(screen.getByLabelText(/Configuration Name/).className).toContain("h-[34px]");
    expect(dialog.querySelectorAll('[role="checkbox"]')).toHaveLength(0);
    expect(dialog.querySelectorAll('[role="switch"]')).toHaveLength(2);

    fireEvent.change(screen.getByLabelText(/Configuration Name/), { target: { value: "Main" } });
    expect(update).toHaveBeenCalledWith("name", "Main");
    fireEvent.change(screen.getByLabelText(/^Port/), { target: { value: "8089" } });
    expect(update).toHaveBeenCalledWith("sip_port", 8089);
    fireEvent.change(screen.getByLabelText(/^Port/), { target: { value: "" } });
    expect(update).toHaveBeenCalledWith("sip_port", 5060);
    fireEvent.change(screen.getByLabelText(/SIP Password/), { target: { value: "secret-1" } });
    expect(update).toHaveBeenCalledWith("password", "secret-1");
    fireEvent.change(screen.getByLabelText(/TURN password/i), { target: { value: "turn-1" } });
    expect(update).toHaveBeenCalledWith("turn_password", "turn-1");
    fireEvent.click(screen.getByRole("switch", { name: /Active Configuration/ }));
    expect(update).toHaveBeenCalledWith("is_active", false);
    fireEvent.click(screen.getByRole("switch", { name: /Set as Default/ }));
    expect(update).toHaveBeenCalledWith("is_default", true);
  });

  it("submit needs name, server, username and (new) the trunk password", () => {
    const { unmount } = renderForm({ name: "A", sip_server: "s", username: "u", password: "" });
    expect(screen.getByTestId("sip-form-submit")).toBeDisabled();
    unmount();
    renderForm({ name: "A", sip_server: "s", username: "u", password: "pw" });
    expect(screen.getByTestId("sip-form-submit")).toBeEnabled();
    fireEvent.click(screen.getByTestId("sip-form-submit"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("sip-form-submit")).toHaveTextContent("Create Configuration");
  });

  it("editing: passwords are never prefilled; the hint says whether one is stored", () => {
    renderForm(editValues, detail);
    const password = screen.getByLabelText(/SIP Password/) as HTMLInputElement;
    expect(password).toHaveValue("");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("placeholder", "••••••••");
    expect(screen.getByText(lookup(cl03Messages.en, "calls.settings.secretSetHint") as string)).toBeInTheDocument();
    const turn = screen.getByLabelText(/TURN password/i) as HTMLInputElement;
    expect(turn).toHaveValue("");
    expect(turn).not.toHaveAttribute("placeholder");
    expect(screen.getByText(lookup(cl03Messages.en, "calls.settings.secretUnsetHint") as string)).toBeInTheDocument();
    // every other stored value is loaded
    expect(screen.getByLabelText(/Trunk Phone Number/)).toHaveValue("+995322000111");
    expect(screen.getByLabelText(/Max Calls/)).toHaveValue(9);
    expect(screen.getByRole("switch", { name: /Set as Default/ })).toBeChecked();
    // blank password is fine on edit
    expect(screen.getByTestId("sip-form-submit")).toBeEnabled();
    expect(screen.getByTestId("sip-form-submit")).toHaveTextContent("Update Configuration");
  });

  it("the eye button reveals what was typed without touching the value", () => {
    renderForm({ name: "A", sip_server: "s", username: "u", password: "typed" });
    const password = screen.getByLabelText(/SIP Password/) as HTMLInputElement;
    expect(password).toHaveValue("typed");
    fireEvent.click(within(screen.getByTestId("sip-form-credentials")).getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(update).not.toHaveBeenCalled();
  });

  it("Cancel and the dialog close call onClose", () => {
    renderForm({ name: "A" });
    fireEvent.click(screen.getByTestId("sip-form-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is translated in Georgian", () => {
    renderForm(editValues, detail, "ka");
    const dialog = screen.getByTestId("sip-config-form");
    expect(dialog).toHaveTextContent(lookup(cl03Messages.ka, "calls.settings.connectionSection") as string);
    expect(dialog).toHaveTextContent(lookup(cl03Messages.ka, "calls.settings.secretSetHint") as string);
    expect(screen.getByTestId("sip-form-submit")).toHaveTextContent(lookup(cl03Messages.ka, "calls.settings.updateConfiguration") as string);
    expect(screen.getByTestId("sip-form-cancel")).toHaveTextContent(lookup(cl03Messages.ka, "common.cancel") as string);
  });
});
