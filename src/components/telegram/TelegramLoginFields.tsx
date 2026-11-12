"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TelegramLogin } from "./useTelegramLogin";

/**
 * The input of the current login step (phone, code or 2FA password) with
 * its label and hint; Enter submits the step. Buttons stay with the caller.
 */
export function TelegramLoginFields({ login, idPrefix = "tg", autoFocus = true }: { login: TelegramLogin; idPrefix?: string; autoFocus?: boolean }) {
  const t = useTranslations("social.telegram");
  const { step } = login;

  if (step === "phone") {
    return (
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`}>{t("phoneLabel")}</Label>
        <Input
          id={`${idPrefix}-phone`}
          type="tel"
          placeholder="+995599123456"
          value={login.phone}
          onChange={(e) => login.setPhone(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && login.canSend) login.sendCode();
          }}
          autoFocus={autoFocus}
          data-testid={`${idPrefix}-phone`}
        />
        <p className="text-xs text-muted-foreground">{t("phoneHint")}</p>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-code`}>{t("codeLabel")}</Label>
        <Input
          id={`${idPrefix}-code`}
          inputMode="numeric"
          placeholder="12345"
          value={login.code}
          onChange={(e) => login.setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && login.canVerify) login.verify();
          }}
          autoFocus={autoFocus}
          data-testid={`${idPrefix}-code`}
        />
        <p className="text-xs text-muted-foreground">{t("codeHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-password`}>{t("passwordLabel")}</Label>
      <Input
        id={`${idPrefix}-password`}
        type="password"
        value={login.password}
        onChange={(e) => login.setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && login.canVerify) login.verify();
        }}
        autoFocus={autoFocus}
        data-testid={`${idPrefix}-password`}
      />
      <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
    </div>
  );
}
