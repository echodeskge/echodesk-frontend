"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useWhatsAppStatus,
  useSendWhatsAppTemplateMessage,
  useSendWhatsAppMessage,
  useMessagingWindow,
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

// Stable error codes the template endpoint can return (services/whatsapp_errors.py).
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
 * Start a WhatsApp conversation from the inbox.
 *
 * WhatsApp only delivers a free-form message inside the 24-hour customer-service
 * window (the recipient messaged within the last 24h). For a number with an open
 * window we show a free-form composer; otherwise (a brand-new / cold number, where
 * Meta requires it) we require an approved template + an opt-in confirmation.
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
  const [debouncedPhone, setDebouncedPhone] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [freeText, setFreeText] = useState("");

  const sendTemplate = useSendWhatsAppTemplateMessage();
  const sendFreeform = useSendWhatsAppMessage();

  const effectiveWabaId = wabaId || accounts[0]?.waba_id || "";
  const selectedAccount = accounts.find((a) => a.waba_id === effectiveWabaId);
  const quality = (selectedAccount?.quality_rating || "").toUpperCase();
  const lowQuality = quality === "RED" || quality === "LOW";

  const trimmedPhone = phone.trim();
  const isPhoneValid = PHONE_RE.test(trimmedPhone);

  // Debounce the phone used for the window lookup so we don't query on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedPhone(trimmedPhone), 300);
    return () => clearTimeout(id);
  }, [trimmedPhone]);

  const windowEnabled =
    open && PHONE_RE.test(debouncedPhone) && !!effectiveWabaId;
  const windowQuery = useMessagingWindow(
    "whatsapp",
    debouncedPhone.replace(/^\+/, ""),
    effectiveWabaId,
    { enabled: windowEnabled }
  );

  // Only branch once we have a definitive window answer for the *current* number.
  const windowResolved =
    isPhoneValid && debouncedPhone === trimmedPhone && windowQuery.isSuccess;
  const windowOpen = windowResolved && windowQuery.data?.window_open === true;
  const checkingWindow = isPhoneValid && !!effectiveWabaId && !windowResolved;

  const resetAndClose = () => {
    setPhone("");
    setDebouncedPhone("");
    setOptIn(false);
    setWabaId("");
    setFreeText("");
    onOpenChange(false);
  };

  const navigateToChat = (to: string) => {
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
  };

  const handleTemplateSelected = (
    template: WhatsAppMessageTemplate,
    parameters: Record<string, string>
  ) => {
    const to = trimmedPhone;
    sendTemplate.mutate(
      {
        waba_id: effectiveWabaId,
        template_id: Number(template.id),
        to_number: to,
        parameters,
        opt_in_confirmed: true,
      },
      {
        onSuccess: () => navigateToChat(to),
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

  const handleSendFreeform = () => {
    const to = trimmedPhone;
    sendFreeform.mutate(
      { to_number: to, message: freeText.trim(), waba_id: effectiveWabaId },
      {
        onSuccess: () => navigateToChat(to),
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { error?: string } } };
          toast({
            title: t("sendFailed"),
            description: err.response?.data?.error || t("sendErrors.SEND_FAILED_GENERIC"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const canPickTemplate = optIn && !!effectiveWabaId && !sendTemplate.isPending;

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

          {/* Branch on the 24h window once we know the recipient. */}
          {checkingWindow && (
            <p className="text-xs text-muted-foreground">{t("checkingWindow")}</p>
          )}

          {windowOpen && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t("windowOpenHint")}</p>
              <Textarea
                placeholder={t("messagePlaceholder")}
                className="min-h-[100px] resize-y"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={!freeText.trim() || sendFreeform.isPending}
                onClick={handleSendFreeform}
              >
                <Send className="mr-2 h-4 w-4" />
                {t("send")}
              </Button>
            </div>
          )}

          {windowResolved && !windowOpen && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">{t("windowClosedHint")}</p>
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
                recipientNumber={trimmedPhone}
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
