"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookingApiError, bookingApi } from "@/lib/booking-api"
import { useSalon } from "./salon-context"

/** Only same-site paths under this salon are accepted as a post-login target. */
function useNextPath(): string {
  const { salon } = useSalon()
  const next = useSearchParams().get("next")
  return next && next.startsWith(`/${salon}`) && !next.startsWith("//") ? next : `/${salon}/account`
}

function FormShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-sm space-y-5">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  error,
  autoComplete,
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  error?: string
  autoComplete?: string
  inputMode?: "numeric" | "email" | "tel" | "text"
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={!!error}
        className={error ? "border-destructive" : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" className="w-full" disabled={busy}>
      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}

function useErrorToast() {
  const t = useTranslations("publicBooking")
  return (error: unknown) =>
    toast.error((error instanceof BookingApiError && error.message) || t("wizard.errors.generic"))
}

// ---------------------------------------------------------------------------

export function LoginForm() {
  const { salon } = useSalon()
  const t = useTranslations("publicBooking")
  const router = useRouter()
  const nextPath = useNextPath()
  const showError = useErrorToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await bookingApi.login(salon, email.trim(), password)
      router.push(nextPath)
    } catch (error) {
      setBusy(false)
      if (error instanceof BookingApiError && error.code === "email_not_verified") {
        router.push(`/${salon}/verify?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(nextPath)}`)
        return
      }
      showError(error)
    }
  }

  return (
    <FormShell title={t("auth.signInTitle")}>
      <form onSubmit={submit} className="space-y-4">
        <TextField id="email" label={t("wizard.email")} type="email" value={email} onChange={setEmail} autoComplete="email" />
        <TextField
          id="password"
          label={t("auth.password")}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <SubmitButton busy={busy}>{t("header.signIn")}</SubmitButton>
      </form>
      <div className="flex justify-between text-sm">
        <Link href={`/${salon}/reset-password`} className="text-primary hover:underline">
          {t("auth.forgotPassword")}
        </Link>
        <Link href={`/${salon}/register?next=${encodeURIComponent(nextPath)}`} className="text-primary hover:underline">
          {t("auth.createAccount")}
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">{t("auth.noAccountNeeded")}</p>
    </FormShell>
  )
}

// ---------------------------------------------------------------------------

export function RegisterForm() {
  const { salon } = useSalon()
  const t = useTranslations("publicBooking")
  const locale = useLocale()
  const router = useRouter()
  const nextPath = useNextPath()
  const showError = useErrorToast()
  const [form, setForm] = useState({ first_name: "", last_name: "", phone_number: "", email: "", password: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (form.password.length < 8 || !/\d/.test(form.password)) {
      setErrors({ password: t("auth.passwordRule") })
      return
    }
    setBusy(true)
    setErrors({})
    try {
      await bookingApi.register(
        salon,
        {
          email: form.email.trim(),
          phone_number: form.phone_number.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          password: form.password,
          password_confirm: form.password,
        },
        locale
      )
      router.push(`/${salon}/verify?email=${encodeURIComponent(form.email.trim())}&next=${encodeURIComponent(nextPath)}`)
    } catch (error) {
      setBusy(false)
      if (error instanceof BookingApiError && Object.keys(error.fields).length) setErrors(error.fields)
      else showError(error)
    }
  }

  return (
    <FormShell title={t("auth.registerTitle")}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField id="first_name" label={t("wizard.firstName")} value={form.first_name} onChange={set("first_name")} error={errors.first_name} autoComplete="given-name" />
          <TextField id="last_name" label={t("wizard.lastName")} value={form.last_name} onChange={set("last_name")} error={errors.last_name} autoComplete="family-name" />
        </div>
        <TextField id="phone_number" label={t("wizard.phone")} type="tel" value={form.phone_number} onChange={set("phone_number")} error={errors.phone_number} autoComplete="tel" />
        <TextField id="email" label={t("wizard.email")} type="email" value={form.email} onChange={set("email")} error={errors.email} autoComplete="email" />
        <TextField id="password" label={t("auth.password")} type="password" value={form.password} onChange={set("password")} error={errors.password} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">{t("auth.passwordRule")}</p>
        <SubmitButton busy={busy}>{t("auth.createAccount")}</SubmitButton>
      </form>
      <p className="text-sm">
        {t("wizard.haveAccount")}{" "}
        <Link href={`/${salon}/login?next=${encodeURIComponent(nextPath)}`} className="text-primary hover:underline">
          {t("header.signIn")}
        </Link>
      </p>
    </FormShell>
  )
}

// ---------------------------------------------------------------------------

export function VerifyEmailForm() {
  const { salon } = useSalon()
  const t = useTranslations("publicBooking")
  const locale = useLocale()
  const router = useRouter()
  const nextPath = useNextPath()
  const showError = useErrorToast()
  const [email, setEmail] = useState(useSearchParams().get("email") || "")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await bookingApi.verify(salon, email.trim(), code.trim())
      // Already verified earlier → no session in the answer; sign in normally.
      router.push(result.access ? nextPath : `/${salon}/login?next=${encodeURIComponent(nextPath)}`)
    } catch (error) {
      setBusy(false)
      showError(error)
    }
  }

  const resend = async () => {
    if (!email.trim()) return
    setResending(true)
    try {
      await bookingApi.resendVerification(salon, email.trim(), locale)
      toast.success(t("auth.codeSent"))
    } catch (error) {
      showError(error)
    } finally {
      setResending(false)
    }
  }

  return (
    <FormShell title={t("auth.verifyTitle")}>
      <p className="text-sm text-muted-foreground">{t("auth.verifyIntro")}</p>
      <form onSubmit={submit} className="space-y-4">
        <TextField id="email" label={t("wizard.email")} type="email" value={email} onChange={setEmail} autoComplete="email" />
        <TextField id="code" label={t("auth.code")} value={code} onChange={setCode} inputMode="numeric" autoComplete="one-time-code" />
        <SubmitButton busy={busy}>{t("auth.verify")}</SubmitButton>
      </form>
      <Button variant="ghost" className="w-full" disabled={resending} onClick={resend}>
        {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("auth.resendCode")}
      </Button>
    </FormShell>
  )
}

// ---------------------------------------------------------------------------

export function ResetPasswordForm() {
  const { salon } = useSalon()
  const t = useTranslations("publicBooking")
  const locale = useLocale()
  const router = useRouter()
  const showError = useErrorToast()
  const [step, setStep] = useState<"request" | "confirm">("request")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const request = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await bookingApi.requestPasswordReset(salon, email.trim(), locale)
      setStep("confirm")
      toast.success(t("auth.resetCodeSent"))
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 8 || !/\d/.test(password)) {
      setError(t("auth.passwordRule"))
      return
    }
    setBusy(true)
    setError("")
    try {
      await bookingApi.confirmPasswordReset(salon, email.trim(), code.trim(), password)
      toast.success(t("auth.passwordChanged"))
      router.push(`/${salon}/login`)
    } catch (err) {
      setBusy(false)
      showError(err)
    }
  }

  return (
    <FormShell title={t("auth.resetTitle")}>
      {step === "request" ? (
        <form onSubmit={request} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("auth.resetIntro")}</p>
          <TextField id="email" label={t("wizard.email")} type="email" value={email} onChange={setEmail} autoComplete="email" />
          <SubmitButton busy={busy}>{t("auth.sendCode")}</SubmitButton>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("auth.resetCodeSent")}</p>
          <TextField id="code" label={t("auth.code")} value={code} onChange={setCode} inputMode="numeric" autoComplete="one-time-code" />
          <TextField id="password" label={t("auth.newPassword")} type="password" value={password} onChange={setPassword} error={error} autoComplete="new-password" />
          <SubmitButton busy={busy}>{t("auth.changePassword")}</SubmitButton>
        </form>
      )}
      <Link href={`/${salon}/login`} className="block text-sm text-primary hover:underline">
        {t("auth.backToSignIn")}
      </Link>
    </FormShell>
  )
}
