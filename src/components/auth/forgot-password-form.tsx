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

interface ForgotPasswordFormProps {
  tenant: TenantConfig
  onBackToSignIn: () => void
}

export function ForgotPasswordForm({ tenant, onBackToSignIn }: ForgotPasswordFormProps) {
  const t = useTranslations("auth")
  const [success, setSuccess] = useState(false)
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
          'Origin': typeof window !== 'undefined' ? window.location.origin : '',
        },
        mode: 'cors',
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setSuccess(true)
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

  if (success) {
    return (
      <div className="grid gap-6">
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 border border-green-200">
          <div className="font-medium">{t("emailSent")}</div>
          <div className="mt-1">
            {t("resetInstructionsSent")}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onBackToSignIn}
          className="w-full"
        >
          {t("backToSignIn")}
        </Button>
      </div>
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