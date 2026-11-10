"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { rdButton } from "@/components/redesign/buttons";
import type { SipConfigurationDetail } from "@/api/generated/interfaces";

interface SipConfigFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  configForm: Partial<SipConfigurationDetail>;
  updateFormField: (field: string, value: any) => void;
  editingConfig: SipConfigurationDetail | null;
  saving: boolean;
}

export function SipConfigForm({
  open,
  onClose,
  onSave,
  configForm,
  updateFormField,
  editingConfig,
  saving,
}: SipConfigFormProps) {
  const t = useTranslations("calls");
  const tCommon = useTranslations("common");

  const handleSave = async () => {
    await onSave();
  };

  // The API never returns the stored password, so an edit may leave it blank
  // (blank keeps the stored one). A new configuration still needs one.
  const isValid =
    configForm.name &&
    configForm.sip_server &&
    configForm.username &&
    (editingConfig || (configForm as any).password);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingConfig ? t("settings.editConfiguration") : t("settings.addConfigurationTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.configureSettings")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Configuration */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[13px]" htmlFor="name">{t("settings.configurationName")} *</Label>
              <Input
                className="h-[34px] text-[13px]"
                id="name"
                value={configForm.name || ""}
                onChange={(e) => updateFormField("name", e.target.value)}
                placeholder="My SIP Server"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px]" htmlFor="phone_number">{t("settings.trunkPhoneNumber")}</Label>
              <Input
                className="h-[34px] text-[13px]"
                id="phone_number"
                value={(configForm as any).phone_number || ""}
                onChange={(e) => updateFormField("phone_number", e.target.value)}
                placeholder="+995322421219"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-[13px]" htmlFor="sip_server">{t("settings.sipServer")} *</Label>
              <Input
                className="h-[34px] text-[13px]"
                id="sip_server"
                value={configForm.sip_server || ""}
                onChange={(e) => updateFormField("sip_server", e.target.value)}
                placeholder="pbx.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px]" htmlFor="sip_port">{t("settings.port")}</Label>
              <Input
                className="h-[34px] text-[13px]"
                id="sip_port"
                type="number"
                value={configForm.sip_port || 5060}
                onChange={(e) =>
                  updateFormField("sip_port", parseInt(e.target.value) || 5060)
                }
                placeholder="8089"
              />
            </div>
          </div>

          {/* Trunk Credentials */}
          <fieldset className="space-y-4 rounded-[10px] border px-4 pb-4 pt-3">
            <legend className="px-1 text-[13px] font-semibold">{t("settings.trunkCredentials")}</legend>
            <div className="space-y-4">
              <p className="text-xs leading-[17px] text-muted-foreground">{t("settings.trunkCredentialsDesc")}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[13px]" htmlFor="username">{t("settings.trunkUsername")} *</Label>
                  <Input
                    className="h-[34px] text-[13px]"
                    id="username"
                    value={configForm.username || ""}
                    onChange={(e) => updateFormField("username", e.target.value)}
                    placeholder="sip_user_id"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px]" htmlFor="password">
                    {t("settings.trunkPassword")}
                    {editingConfig ? "" : " *"}
                  </Label>
                  <Input
                    className="h-[34px] text-[13px]"
                    id="password"
                    type="password"
                    value={(configForm as any).password || ""}
                    onChange={(e) => updateFormField("password", e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[13px]" htmlFor="realm">{t("settings.realm")}</Label>
                  <Input
                    className="h-[34px] text-[13px]"
                    id="realm"
                    value={configForm.realm || ""}
                    onChange={(e) => updateFormField("realm", e.target.value)}
                    placeholder="example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px]" htmlFor="proxy">{t("settings.proxy")}</Label>
                  <Input
                    className="h-[34px] text-[13px]"
                    id="proxy"
                    value={configForm.proxy || ""}
                    onChange={(e) => updateFormField("proxy", e.target.value)}
                    placeholder="proxy.example.com"
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label className="text-[13px]" htmlFor="websocket_path">{t("settings.websocketPath")}</Label>
            <Input
              className="h-[34px] text-[13px]"
              id="websocket_path"
              value={(configForm as any).websocket_path || "/ws"}
              onChange={(e) => updateFormField("websocket_path", e.target.value)}
              placeholder="/ws"
            />
            <p className="text-xs leading-[17px] text-muted-foreground">
              {t("settings.websocketPathHint")}
            </p>
          </div>

          {/* WebRTC Configuration */}
          <fieldset className="space-y-4 rounded-[10px] border px-4 pb-4 pt-3">
            <legend className="px-1 text-[13px] font-semibold">{t("settings.webrtcSettings")}</legend>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px]" htmlFor="stun_server">{t("settings.stunServer")}</Label>
                <Input
                  className="h-[34px] text-[13px]"
                  id="stun_server"
                  value={configForm.stun_server || ""}
                  onChange={(e) => updateFormField("stun_server", e.target.value)}
                  placeholder="stun:stun.l.google.com:19302"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-1">
                  <Label className="text-[13px]" htmlFor="turn_server">{t("settings.turnServer")}</Label>
                  <Input
                    className="h-[34px] text-[13px]"
                    id="turn_server"
                    value={configForm.turn_server || ""}
                    onChange={(e) =>
                      updateFormField("turn_server", e.target.value)
                    }
                    placeholder="turn:turn.example.com:3478"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px]" htmlFor="turn_username">{t("settings.turnUsername")}</Label>
                  <Input
                    className="h-[34px] text-[13px]"
                    id="turn_username"
                    value={configForm.turn_username || ""}
                    onChange={(e) =>
                      updateFormField("turn_username", e.target.value)
                    }
                    placeholder="turnuser"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px]" htmlFor="max_concurrent_calls">{t("settings.maxCalls")}</Label>
                  <Input
                    className="h-[34px] text-[13px]"
                    id="max_concurrent_calls"
                    type="number"
                    value={configForm.max_concurrent_calls || 5}
                    onChange={(e) =>
                      updateFormField(
                        "max_concurrent_calls",
                        parseInt(e.target.value) || 5
                      )
                    }
                    placeholder="5"
                    min={1}
                    max={20}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          {/* Status Options */}
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={configForm.is_active}
                onCheckedChange={(checked) =>
                  updateFormField("is_active", checked)
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer text-[13px]">
                {t("settings.activeConfiguration")}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={configForm.is_default}
                onCheckedChange={(checked) =>
                  updateFormField("is_default", checked)
                }
              />
              <Label htmlFor="is_default" className="cursor-pointer text-[13px]">
                {t("settings.setAsDefault")}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button type="button" className={rdButton.outline} onClick={onClose} disabled={saving}>
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            className={rdButton.primary}
            onClick={handleSave}
            disabled={!isValid || saving}
            data-testid="sip-form-submit"
          >
            {saving
              ? tCommon("saving")
              : editingConfig
              ? t("settings.updateConfiguration")
              : t("settings.createConfiguration")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
