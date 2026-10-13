"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"

import { ForgotPasswordSchema, type ForgotPasswordFormType } from "@/schemas/auth"
import { TenantConfig } from "@/types/tenant"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ForgotPasswordFormProps {
  tenant: TenantConfig
  onBackToSignIn: () => void
}

export function ForgotPasswordForm({ tenant, onBackToSignIn }: ForgotPasswordFormProps) {
  const t = useTranslations("auth")
  // email → code (sent) → done
  const [step, setStep] = useState<"email" | "code" | "done">("email")
  const [sentTo, setSentTo] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")

  const form = useForm<ForgotPasswordFormType>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const { isSubmitting } = form.formState
  const isDisabled = isSubmitting

  async function onSubmit(data: ForgotPasswordFormType) {
    const { email } = data
    setError("")

    try {
      const response = await fetch(`${tenant.api_url}/users/password-reset/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setSentTo(email)
        setStep("code")
      } else {
        const errorData = await response.json()
        setError(errorData.detail || errorData.message || t("resetEmailFailed"))
      }
    } catch (err: unknown) {
      console.error('Forgot password error:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(t("networkError"))
      }
    }
  }

  async function confirmReset(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (newPassword !== confirmPassword) {
      setError(t("passwordsDoNotMatch"))
      return
    }
    setConfirming(true)
    try {
      const response = await fetch(`${tenant.api_url}/users/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: sentTo, code: code.trim(), new_password: newPassword }),
      })
      if (response.ok) {
        setStep("done")
        return
      }
      const data = await response.json().catch(() => ({}))
      if (data.code === "invalid_code") setError(t("resetCodeInvalid"))
      else if (Array.isArray(data.new_password)) setError(data.new_password.join(" "))
      else setError(data.detail || t("resetEmailFailed"))
    } catch {
      setError(t("networkError"))
    } finally {
      setConfirming(false)
    }
  }

  if (step === "done") {
    return (
      <div className="grid gap-6">
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 border border-green-200">
          <div className="font-medium">{t("passwordResetDone")}</div>
        </div>
        <Button type="button" onClick={onBackToSignIn} className="w-full">
          {t("backToSignIn")}
        </Button>
      </div>
    )
  }

  if (step === "code") {
    return (
      <form onSubmit={confirmReset} className="grid gap-4">
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 border border-green-200">
          {t("resetCodeSent", { email: sentTo })}
        </div>
        {error && <div className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}
        <div className="grid gap-2">
          <Label htmlFor="reset-code">{t("resetCode")}</Label>
          <Input
            id="reset-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reset-new">{t("newPassword")}</Label>
          <Input id="reset-new" type="password" autoComplete="new-password" placeholder={t("newPasswordPlaceholder")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">{t("passwordRequirements")}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reset-confirm">{t("confirmPassword")}</Label>
          <Input id="reset-confirm" type="password" autoComplete="new-password" placeholder={t("confirmPasswordPlaceholder")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={confirming || code.length !== 6 || newPassword.length < 8}>
          {confirming ? t("changingPassword") : t("setNewPassword")}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep("email"); setCode(""); setError("") }}>
          {t("resendCode")}
        </Button>
        <Button type="button" variant="outline" onClick={onBackToSignIn} className="w-full">
          {t("backToSignIn")}
        </Button>
      </form>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        {error && (
          <div className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isDisabled} className="w-full">
          {isSubmitting ? t("sending") : t("sendResetInstructions")}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onBackToSignIn}
          className="w-full"
        >
          {t("backToSignIn")}
        </Button>
      </form>
    </Form>
  )
}