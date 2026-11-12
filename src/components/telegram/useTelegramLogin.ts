"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TelegramVerifyResponse } from "@/api/generated";
import { useTelegramSendCode, useTelegramVerify } from "@/hooks/api/useSocial";

// E.164: + followed by 7-15 digits (matches the backend serializer's regex).
export const TELEGRAM_PHONE_RE = /^\+\d{7,15}$/;

export type TelegramLoginStep = "phone" | "code" | "password";

export interface TelegramLoginNotify {
  success: (message: string) => void;
  error: (message: string) => void;
}

/**
 * The phone → code → 2FA password login of a Telegram account
 * (`/api/social/telegram/connect/` then `/verify/`), shared by the
 * Settings → Connections card and the onboarding Inbox step. The caller
 * renders the inputs (`TelegramLoginFields`) and the buttons; `notify`
 * receives the translated toasts.
 */
export function useTelegramLogin({
  notify,
  onConnected,
}: {
  notify: TelegramLoginNotify;
  onConnected?: (res: TelegramVerifyResponse) => void;
}) {
  const t = useTranslations("social.telegram");
  const sendCodeMutation = useTelegramSendCode();
  const verifyMutation = useTelegramVerify();

  const [step, setStep] = useState<TelegramLoginStep>("phone");
  const [phone, setPhoneRaw] = useState("");
  const [code, setCodeRaw] = useState("");
  const [password, setPassword] = useState("");
  const [loginToken, setLoginToken] = useState("");

  const setPhone = (value: string) => setPhoneRaw(value.replace(/[^\d+]/g, ""));
  const setCode = (value: string) => setCodeRaw(value.replace(/\D/g, ""));

  const reset = () => {
    setStep("phone");
    setPhoneRaw("");
    setCodeRaw("");
    setPassword("");
    setLoginToken("");
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorMessage = (err: any): string => {
    const data = err?.response?.data;
    if (data?.error_code === "flood_wait") {
      return t("floodWait", { seconds: data.retry_after ?? 60 });
    }
    return data?.error || err?.message || t("genericError");
  };

  const canSend = TELEGRAM_PHONE_RE.test(phone.trim()) && !sendCodeMutation.isPending;
  const canVerify =
    step === "password" ? !!password && !verifyMutation.isPending : code.trim().length >= 4 && !verifyMutation.isPending;

  const sendCode = async () => {
    if (!TELEGRAM_PHONE_RE.test(phone.trim())) return;
    try {
      const res = await sendCodeMutation.mutateAsync(phone.trim());
      setLoginToken(res.login_token);
      setStep("code");
      notify.success(t("codeSent"));
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  /** Verifies the code, or the 2FA password while on the password step. */
  const verify = async () => {
    const withPassword = step === "password";
    try {
      const res = await verifyMutation.mutateAsync(
        withPassword ? { login_token: loginToken, password } : { login_token: loginToken, code: code.trim() }
      );
      if (res.status === "password_required") {
        setStep("password");
        return;
      }
      notify.success(t("connectedSuccess"));
      reset();
      onConnected?.(res);
    } catch (err) {
      const status = (err as { response?: { status?: number } } | null)?.response?.status;
      // 410 = login state expired — restart from the phone step.
      if (status === 410) {
        notify.error(t("loginExpired"));
        reset();
        return;
      }
      notify.error(errorMessage(err));
    }
  };

  return {
    step,
    phone,
    setPhone,
    code,
    setCode,
    password,
    setPassword,
    reset,
    sendCode,
    verify,
    canSend,
    canVerify,
    sending: sendCodeMutation.isPending,
    verifying: verifyMutation.isPending,
  };
}

export type TelegramLogin = ReturnType<typeof useTelegramLogin>;
