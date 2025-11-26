"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const isValid =
    configForm.name && configForm.sip_server && configForm.username;

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
          <div className="space-y-2">
            <Label htmlFor="name">{t("settings.configurationName")} *</Label>
            <Input
              id="name"
              value={configForm.name || ""}
              onChange={(e) => updateFormField("name", e.target.value)}
              placeholder="My SIP Server"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="sip_server">{t("settings.sipServer")} *</Label>
              <Input
                id="sip_server"
                value={configForm.sip_server || ""}
                onChange={(e) => updateFormField("sip_server", e.target.value)}
                placeholder="sip.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sip_port">{t("settings.port")}</Label>
              <Input
                id="sip_port"
                type="number"
                value={configForm.sip_port || 5060}
                onChange={(e) =>
                  updateFormField("sip_port", parseInt(e.target.value) || 5060)
                }
                placeholder="5060"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">{t("settings.username")} *</Label>
            <Input
              id="username"
              value={configForm.username || ""}
              onChange={(e) => updateFormField("username", e.target.value)}
              placeholder="user123"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="realm">{t("settings.realm")}</Label>
              <Input
                id="realm"
                value={configForm.realm || ""}
                onChange={(e) => updateFormField("realm", e.target.value)}
                placeholder="example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proxy">{t("settings.proxy")}</Label>
              <Input
                id="proxy"
                value={configForm.proxy || ""}
                onChange={(e) => updateFormField("proxy", e.target.value)}
                placeholder="proxy.example.com"
              />
            </div>
          </div>

          {/* WebRTC Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("settings.webrtcSettings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stun_server">{t("settings.stunServer")}</Label>
                <Input
                  id="stun_server"
                  value={configForm.stun_server || ""}
                  onChange={(e) => updateFormField("stun_server", e.target.value)}
                  placeholder="stun:stun.l.google.com:19302"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="turn_server">{t("settings.turnServer")}</Label>
                  <Input
                    id="turn_server"
                    value={configForm.turn_server || ""}
                    onChange={(e) =>
                      updateFormField("turn_server", e.target.value)
                    }
                    placeholder="turn:turn.example.com:3478"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="turn_username">{t("settings.turnUsername")}</Label>
                  <Input
                    id="turn_username"
                    value={configForm.turn_username || ""}
                    onChange={(e) =>
                      updateFormField("turn_username", e.target.value)
                    }
                    placeholder="turnuser"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_concurrent_calls">{t("settings.maxCalls")}</Label>
                  <Input
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
            </CardContent>
          </Card>

          {/* Status Options */}
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={configForm.is_active}
                onCheckedChange={(checked) =>
                  updateFormField("is_active", checked)
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer">
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
              <Label htmlFor="is_default" className="cursor-pointer">
                {t("settings.setAsDefault")}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving
              ? tCommon("saving")
              : editingConfig
              ? t("settings.updateConfiguration")
              : t("settings.createConfiguration")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
