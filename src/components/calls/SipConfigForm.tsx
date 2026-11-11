"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rdButton } from "@/components/redesign/buttons";
import {
  FieldRow,
  SecretInput,
  SettingsSection,
  SettingsToggle,
  settingsFieldWidth,
  settingsInputClass,
} from "@/components/redesign/settings";
import { cn } from "@/lib/utils";
import type { SipConfigurationDetail } from "@/api/generated/interfaces";

/**
 * The form values the settings page keeps. The API never returns stored
 * secrets (`has_password` / `has_turn_password` say whether one exists), so
 * `password` / `turn_password` are only ever what the admin typed now.
 */
export type SipConfigFormValues = Partial<SipConfigurationDetail> & {
  password?: string;
  turn_password?: string;
  phone_number?: string;
  websocket_path?: string;
};

interface SipConfigFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  configForm: SipConfigFormValues;
  updateFormField: (field: string, value: unknown) => void;
  editingConfig: SipConfigurationDetail | null;
  saving: boolean;
}

const inputClass = cn(settingsInputClass, settingsFieldWidth);

function TextField({
  id,
  label,
  help,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  min,
  max,
  mono,
}: {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  required?: boolean;
  min?: number;
  max?: number;
  mono?: boolean;
}) {
  return (
    <FieldRow
      label={
        <>
          {label}
          {required && <span aria-hidden> *</span>}
        </>
      }
      help={help}
      htmlFor={id}
    >
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        className={cn(inputClass, mono && "font-mono")}
      />
    </FieldRow>
  );
}

/** Create / edit dialog of a SIP configuration on the settings kit (FORM page rows inside the dialog shell). */
export function SipConfigForm({
  open,
  onClose,
  onSave,
  configForm,
  updateFormField,
  editingConfig,
  saving,
}: SipConfigFormProps) {
  const t = useTranslations("calls.settings");
  const tCommon = useTranslations("common");
  const tSecret = useTranslations("pbxSettings.secret");

  const number = (value: string, fallback: number) => parseInt(value, 10) || fallback;

  // Hint under a secret field: whether one is stored (edit) and that blank keeps it.
  const secretHint = (stored: boolean | undefined) =>
    editingConfig ? (stored ? t("secretSetHint") : t("secretUnsetHint")) : undefined;

  // A new configuration needs the trunk password; on edit, blank keeps the stored one.
  const isValid = Boolean(configForm.name && configForm.sip_server && configForm.username && (editingConfig || configForm.password));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" data-testid="sip-config-form">
        <DialogHeader>
          <DialogTitle>{editingConfig ? t("editConfiguration") : t("addConfigurationTitle")}</DialogTitle>
          <DialogDescription>{t("configureSettings")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <SettingsSection title={t("connectionSection")} hint={t("connectionHint")} testId="sip-form-connection">
            <TextField
              id="name"
              label={t("configurationName")}
              help={t("configurationNameHint")}
              value={configForm.name || ""}
              onChange={(v) => updateFormField("name", v)}
              placeholder={t("configurationNamePlaceholder")}
              required
            />
            <TextField
              id="phone_number"
              label={t("trunkPhoneNumber")}
              help={t("trunkPhoneNumberHint")}
              value={configForm.phone_number || ""}
              onChange={(v) => updateFormField("phone_number", v)}
              placeholder="+995322421219"
              mono
            />
            <TextField
              id="sip_server"
              label={t("sipServer")}
              help={t("sipServerHint")}
              value={configForm.sip_server || ""}
              onChange={(v) => updateFormField("sip_server", v)}
              placeholder="pbx.example.com"
              required
              mono
            />
            <TextField
              id="sip_port"
              label={t("port")}
              help={t("portHint")}
              type="number"
              value={configForm.sip_port ?? 5060}
              onChange={(v) => updateFormField("sip_port", number(v, 5060))}
              placeholder="8089"
              min={1}
              max={65535}
              mono
            />
            <TextField
              id="websocket_path"
              label={t("websocketPath")}
              help={t("websocketPathHint")}
              value={configForm.websocket_path || "/ws"}
              onChange={(v) => updateFormField("websocket_path", v)}
              placeholder="/ws"
              mono
            />
          </SettingsSection>

          <SettingsSection title={t("credentialsSection")} hint={t("trunkCredentialsDesc")} testId="sip-form-credentials">
            <TextField
              id="username"
              label={t("trunkUsername")}
              value={configForm.username || ""}
              onChange={(v) => updateFormField("username", v)}
              placeholder="sip_user_id"
              required
              mono
            />
            <FieldRow
              label={
                <>
                  {t("trunkPassword")}
                  {!editingConfig && <span aria-hidden> *</span>}
                </>
              }
              help={secretHint(editingConfig?.has_password)}
              htmlFor="password"
            >
              {/* Never prefilled: the value is only what was typed in this dialog. */}
              <SecretInput
                id="password"
                value={configForm.password || ""}
                onChange={(v) => updateFormField("password", v)}
                placeholder={editingConfig?.has_password ? "••••••••" : undefined}
                showLabel={tSecret("show")}
                hideLabel={tSecret("hide")}
                autoComplete="new-password"
                className={settingsFieldWidth}
                testId="sip-form-password"
              />
            </FieldRow>
            <TextField
              id="realm"
              label={t("realm")}
              value={configForm.realm || ""}
              onChange={(v) => updateFormField("realm", v)}
              placeholder="example.com"
              mono
            />
            <TextField
              id="proxy"
              label={t("proxy")}
              value={configForm.proxy || ""}
              onChange={(v) => updateFormField("proxy", v)}
              placeholder="proxy.example.com"
              mono
            />
          </SettingsSection>

          <SettingsSection title={t("webrtcSection")} hint={t("webrtcHint")} testId="sip-form-webrtc">
            <TextField
              id="stun_server"
              label={t("stunServer")}
              value={configForm.stun_server || ""}
              onChange={(v) => updateFormField("stun_server", v)}
              placeholder="stun:stun.example.com:3478"
              mono
            />
            <TextField
              id="turn_server"
              label={t("turnServer")}
              value={configForm.turn_server || ""}
              onChange={(v) => updateFormField("turn_server", v)}
              placeholder="turn:turn.example.com:3478"
              mono
            />
            <TextField
              id="turn_username"
              label={t("turnUsername")}
              value={configForm.turn_username || ""}
              onChange={(v) => updateFormField("turn_username", v)}
              placeholder="turnuser"
              mono
            />
            <FieldRow label={t("turnPassword")} help={secretHint(editingConfig?.has_turn_password)} htmlFor="turn_password">
              <SecretInput
                id="turn_password"
                value={configForm.turn_password || ""}
                onChange={(v) => updateFormField("turn_password", v)}
                placeholder={editingConfig?.has_turn_password ? "••••••••" : undefined}
                showLabel={tSecret("show")}
                hideLabel={tSecret("hide")}
                autoComplete="new-password"
                className={settingsFieldWidth}
                testId="sip-form-turn-password"
              />
            </FieldRow>
            <TextField
              id="max_concurrent_calls"
              label={t("maxCalls")}
              help={t("maxCallsHint")}
              type="number"
              value={configForm.max_concurrent_calls ?? 5}
              onChange={(v) => updateFormField("max_concurrent_calls", number(v, 5))}
              placeholder="5"
              min={1}
              max={20}
              mono
            />
          </SettingsSection>

          <SettingsSection title={t("statusSection")} testId="sip-form-status">
            <FieldRow label={t("activeConfiguration")} help={t("activeHint")} htmlFor="is_active" align="center">
              <SettingsToggle
                id="is_active"
                checked={!!configForm.is_active}
                onCheckedChange={(checked) => updateFormField("is_active", checked)}
                data-testid="sip-form-active"
              />
            </FieldRow>
            <FieldRow label={t("setAsDefault")} help={t("defaultHint")} htmlFor="is_default" align="center">
              <SettingsToggle
                id="is_default"
                checked={!!configForm.is_default}
                onCheckedChange={(checked) => updateFormField("is_default", checked)}
                data-testid="sip-form-default"
              />
            </FieldRow>
          </SettingsSection>
        </div>

        <DialogFooter>
          <button type="button" className={rdButton.outline} onClick={onClose} disabled={saving} data-testid="sip-form-cancel">
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            className={rdButton.primary}
            onClick={() => void onSave()}
            disabled={!isValid || saving}
            data-testid="sip-form-submit"
          >
            {saving ? tCommon("saving") : editingConfig ? t("updateConfiguration") : t("createConfiguration")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
