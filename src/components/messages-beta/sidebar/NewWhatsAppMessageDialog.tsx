"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import type { WhatsAppMessageTemplate } from "@/api/generated";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useWhatsAppStatus,
  useSendWhatsAppTemplateMessage,
} from "@/hooks/api/useSocial";
import { useToast } from "@/hooks/use-toast";
import TemplateSelector from "@/components/social/TemplateSelector";
import { WhatsAppAccountSelect } from "@/components/social/WhatsAppAccountSelect";

import { useMessagesBetaStore } from "../store/useMessagesBetaStore";

interface WhatsAppAccount {
  id: number;
  waba_id: string;
  business_name: string;
  phone_number: string;
  display_phone_number: string;
  quality_rating: string;
  is_active: boolean;
}

interface WhatsAppStatus {
  connected: boolean;
  accounts_count: number;
  accounts: WhatsAppAccount[];
}

// Stable error codes the backend can return (mirrors services/whatsapp_errors.py).
const SEND_ERROR_CODES = [
  "OPT_IN_REQUIRED",
  "RECIPIENT_NOT_OPTED_IN",
  "INVALID_WHATSAPP_NUMBER",
  "TEMPLATE_PAUSED_OR_DISABLED",
  "TEMPLATE_NOT_APPROVED",
  "RATE_OR_TIER_LIMIT",
  "US_MARKETING_PAUSED",
  "TEMPLATE_PARAM_MISMATCH",
  "SEND_FAILED_GENERIC",
] as const;

// E.164: leading +, country digit 1-9, then 7–14 more digits.
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Start a brand-new WhatsApp conversation with a number that hasn't messaged
 * us. WhatsApp only allows this via an approved template to an opted-in number,
 * so the flow is: pick account → enter E.164 phone → confirm opt-in → pick an
 * approved template + fill params → send → navigate to the new thread.
 */
export function NewWhatsAppMessageDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("messagesBeta.newWhatsApp");
  const { toast } = useToast();
  const { data: statusData } = useWhatsAppStatus();
  const status = statusData as WhatsAppStatus | undefined;
  const accounts = useMemo(
    () => (status?.accounts || []).filter((a) => a.is_active),
    [status]
  );

  const [wabaId, setWabaId] = useState("");
  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(false);

  const sendTemplate = useSendWhatsAppTemplateMessage();

  const effectiveWabaId = wabaId || accounts[0]?.waba_id || "";
  const selectedAccount = accounts.find((a) => a.waba_id === effectiveWabaId);
  const quality = (selectedAccount?.quality_rating || "").toUpperCase();
  const lowQuality = quality === "RED" || quality === "LOW";

  const isPhoneValid = PHONE_RE.test(phone.trim());
  const canPickTemplate =
    isPhoneValid && optIn && !!effectiveWabaId && !sendTemplate.isPending;

  const resetAndClose = () => {
    setPhone("");
    setOptIn(false);
    setWabaId("");
    onOpenChange(false);
  };

  const handleTemplateSelected = (
    template: WhatsAppMessageTemplate,
    parameters: Record<string, string>
  ) => {
    const to = phone.trim();
    sendTemplate.mutate(
      {
        waba_id: effectiveWabaId,
        template_id: Number(template.id),
        to_number: to,
        parameters,
        opt_in_confirmed: true,
      },
      {
        onSuccess: () => {
          // chatId must match ws-handlers' buildChatId: wa_{waba}_{bareNumber}
          const chatId = `wa_${effectiveWabaId}_${to.replace(/^\+/, "")}`;
          useMessagesBetaStore.getState().selectChat(chatId);
          window.history.pushState(
            null,
            "",
            `/social/messages/${chatId}${window.location.search}`
          );
          toast({ title: t("sent"), description: t("sentDescription") });
          resetAndClose();
        },
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { error_code?: string } } };
          const code = err.response?.data?.error_code;
          const key =
            code && (SEND_ERROR_CODES as readonly string[]).includes(code)
              ? code
              : "SEND_FAILED_GENERIC";
          toast({
            title: t("sendFailed"),
            description: t(`sendErrors.${key}`),
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : resetAndClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {accounts.length > 1 && (
            <div className="space-y-2">
              <Label>{t("account")}</Label>
              <WhatsAppAccountSelect value={effectiveWabaId} onChange={setWabaId} />
            </div>
          )}

          {selectedAccount && quality && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("quality")}:</span>
              <Badge variant="outline">{quality}</Badge>
            </div>
          )}
          {lowQuality && (
            <Alert variant="destructive">
              <AlertDescription>{t("lowQualityWarning")}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="wa-new-phone">{t("phone")}</Label>
            <Input
              id="wa-new-phone"
              type="tel"
              placeholder="+995555123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {phone.trim() !== "" && !isPhoneValid && (
              <p className="text-xs text-destructive">{t("phoneInvalid")}</p>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={optIn}
              onCheckedChange={(v) => setOptIn(v === true)}
              className="mt-0.5"
            />
            <span className="text-muted-foreground">{t("optInConfirm")}</span>
          </label>

          <TemplateSelector
            wabaId={effectiveWabaId}
            recipientNumber={phone.trim()}
            disabled={!canPickTemplate}
            onSelect={handleTemplateSelected}
            trigger={
              <Button className="w-full" disabled={!canPickTemplate}>
                <Send className="mr-2 h-4 w-4" />
                {t("chooseTemplate")}
              </Button>
            }
          />
          {!canPickTemplate && (
            <p className="text-xs text-muted-foreground">{t("gateHint")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
