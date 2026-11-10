"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Phone, RefreshCw, ShieldCheck, X, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AccountRow,
  AccountRowAction,
  ChannelDetailCard,
  SettingsNote,
  SettingsSection,
} from "@/components/redesign/settings";
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
import {
  useDisconnectTelegram,
  useTelegramSendCode,
  useTelegramStatus,
  useTelegramVerify,
} from "@/hooks/api/useSocial";

export function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

// E.164: + followed by 7-15 digits (matches the backend serializer's regex).
const PHONE_RE = /^\+\d{7,15}$/;

type WizardStep = "phone" | "code" | "password";

export function TelegramConnection() {
  const t = useTranslations("social.telegram");
  const { data: status, isLoading, refetch, isRefetching } = useTelegramStatus();
  const sendCode = useTelegramSendCode();
  const verify = useTelegramVerify();
  const disconnect = useDisconnectTelegram();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loginToken, setLoginToken] = useState("");

  const accounts = status?.accounts ?? [];
  const activeAccounts = accounts.filter((a) => a.is_active);
  const isConnected = !!status?.connected;

  const resetWizard = () => {
    setStep("phone");
    setPhone("");
    setCode("");
    setPassword("");
    setLoginToken("");
  };

  const openWizard = () => {
    resetWizard();
    setDialogOpen(true);
  };

  const errorMessage = (err: any): string => {
    const data = err?.response?.data;
    if (data?.error_code === "flood_wait") {
      return t("floodWait", { seconds: data.retry_after ?? 60 });
    }
    return data?.error || err?.message || t("genericError");
  };

  const handleSendCode = async () => {
    try {
      const res = await sendCode.mutateAsync(phone.trim());
      setLoginToken(res.login_token);
      setStep("code");
      toast.success(t("codeSent"));
    } catch (err: any) {
      toast.error(errorMessage(err));
    }
  };

  const handleVerify = async (withPassword: boolean) => {
    try {
      const res = await verify.mutateAsync(
        withPassword
          ? { login_token: loginToken, password }
          : { login_token: loginToken, code: code.trim() }
      );
      if (res.status === "password_required") {
        setStep("password");
        return;
      }
      toast.success(t("connectedSuccess"));
      setDialogOpen(false);
      resetWizard();
      refetch();
    } catch (err: any) {
      const data = err?.response?.status;
      // 410 = login state expired — restart from the phone step.
      if (data === 410) {
        toast.error(t("loginExpired"));
        resetWizard();
        return;
      }
      toast.error(errorMessage(err));
    }
  };

  const handleDisconnect = async (accountId: number) => {
    if (!confirm(t("confirmDisconnect"))) return;
    try {
      await disconnect.mutateAsync(accountId);
      toast.success(t("disconnectedSuccess"));
    } catch (err: any) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <ChannelDetailCard
        icon={TelegramIcon as unknown as LucideIcon}
        color="#229ED9"
        title={t("title")}
        status={isConnected ? `${activeAccounts.length} ${t("accountsConnected")}` : t("notConnected")}
        statusIcon={isConnected ? CheckCircle2 : X}
        statusTone={isConnected ? "success" : "neutral"}
        badge={{ label: isConnected ? t("badgeConnected") : t("badgeNotConnected"), tone: isConnected ? "success" : "neutral" }}
        actions={[
          { label: isConnected ? t("connectAnother") : t("connect"), icon: Phone, variant: "primary", onClick: openWizard, disabled: isLoading, testId: "telegram-connect" },
          { label: t("refreshStatus"), icon: RefreshCw, variant: "outline", onClick: () => refetch(), disabled: isRefetching, testId: "telegram-refresh" },
        ]}
        testId="telegram-detail"
      >
        {!isConnected && (
          <SettingsNote tone="info" icon={ShieldCheck}>{t("howItWorks")}</SettingsNote>
        )}
      </ChannelDetailCard>

      {accounts.length > 0 && (
        <SettingsSection title={t("connectedAccounts")} testId="telegram-accounts">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              avatar={(account.first_name || account.username || "T").charAt(0).toUpperCase()}
              name={
                [account.first_name, account.last_name].filter(Boolean).join(" ") ||
                account.username ||
                account.phone_number
              }
              meta={
                <>
                  {account.username ? `@${account.username} · ` : ""}
                  <span className="font-mono tabular-nums">{account.phone_number}</span>
                </>
              }
              badge={{ label: account.is_active ? t("active") : t("inactive"), tone: account.is_active ? "success" : "neutral" }}
              actions={
                account.is_active ? (
                  <AccountRowAction
                    label={t("disconnect")}
                    icon={X}
                    tone="danger"
                    onClick={() => handleDisconnect(account.id)}
                    disabled={disconnect.isPending}
                    testId="telegram-disconnect"
                  />
                ) : undefined
              }
              testId="telegram-account-row"
            />
          ))}
        </SettingsSection>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === "phone" && t("wizardPhoneTitle")}
              {step === "code" && t("wizardCodeTitle")}
              {step === "password" && t("wizardPasswordTitle")}
            </DialogTitle>
            <DialogDescription>
              {step === "phone" && t("wizardPhoneDescription")}
              {step === "code" && t("wizardCodeDescription", { phone })}
              {step === "password" && t("wizardPasswordDescription")}
            </DialogDescription>
          </DialogHeader>

          {step === "phone" && (
            <div className="space-y-2">
              <Label htmlFor="tg-phone">{t("phoneLabel")}</Label>
              <Input
                id="tg-phone"
                type="tel"
                placeholder="+995599123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && PHONE_RE.test(phone.trim())) handleSendCode();
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{t("phoneHint")}</p>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-2">
              <Label htmlFor="tg-code">{t("codeLabel")}</Label>
              <Input
                id="tg-code"
                inputMode="numeric"
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.trim().length >= 4) handleVerify(false);
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{t("codeHint")}</p>
            </div>
          )}

          {step === "password" && (
            <div className="space-y-2">
              <Label htmlFor="tg-password">{t("passwordLabel")}</Label>
              <Input
                id="tg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password) handleVerify(true);
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            {step === "phone" && (
              <Button
                onClick={handleSendCode}
                disabled={!PHONE_RE.test(phone.trim()) || sendCode.isPending}
                className="bg-[#229ED9] hover:bg-[#1d8dc4]"
              >
                {sendCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("sendCode")}
              </Button>
            )}
            {step === "code" && (
              <Button
                onClick={() => handleVerify(false)}
                disabled={code.trim().length < 4 || verify.isPending}
                className="bg-[#229ED9] hover:bg-[#1d8dc4]"
              >
                {verify.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("verify")}
              </Button>
            )}
            {step === "password" && (
              <Button
                onClick={() => handleVerify(true)}
                disabled={!password || verify.isPending}
                className="bg-[#229ED9] hover:bg-[#1d8dc4]"
              >
                {verify.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("verify")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
