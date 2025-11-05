"use client";

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
            {editingConfig ? "Edit SIP Configuration" : "Add SIP Configuration"}
          </DialogTitle>
          <DialogDescription>
            Configure your SIP server connection settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Configuration */}
          <div className="space-y-2">
            <Label htmlFor="name">Configuration Name *</Label>
            <Input
              id="name"
              value={configForm.name || ""}
              onChange={(e) => updateFormField("name", e.target.value)}
              placeholder="My SIP Server"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="sip_server">SIP Server *</Label>
              <Input
                id="sip_server"
                value={configForm.sip_server || ""}
                onChange={(e) => updateFormField("sip_server", e.target.value)}
                placeholder="sip.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sip_port">Port</Label>
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
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={configForm.username || ""}
              onChange={(e) => updateFormField("username", e.target.value)}
              placeholder="user123"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="realm">Realm</Label>
              <Input
                id="realm"
                value={configForm.realm || ""}
                onChange={(e) => updateFormField("realm", e.target.value)}
                placeholder="example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proxy">Proxy</Label>
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
              <CardTitle className="text-base">WebRTC Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stun_server">STUN Server</Label>
                <Input
                  id="stun_server"
                  value={configForm.stun_server || ""}
                  onChange={(e) => updateFormField("stun_server", e.target.value)}
                  placeholder="stun:stun.l.google.com:19302"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="turn_server">TURN Server</Label>
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
                  <Label htmlFor="turn_username">TURN Username</Label>
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
                  <Label htmlFor="max_concurrent_calls">Max Calls</Label>
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
                Active Configuration
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
                Set as Default
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving
              ? "Saving..."
              : editingConfig
              ? "Update Configuration"
              : "Create Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
