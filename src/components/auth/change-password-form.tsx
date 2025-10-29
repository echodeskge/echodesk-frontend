"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { z } from "zod"

import { forcedPasswordChange } from "@/api/generated/api"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

// Schema for password change
const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

type ChangePasswordFormType = z.infer<typeof ChangePasswordSchema>

interface ChangePasswordFormProps {
  userId: number
  email: string
  onPasswordChanged: (token: string) => void
}

export function ChangePasswordForm({
  userId,
  email,
  onPasswordChanged,
}: ChangePasswordFormProps) {
  const t = useTranslations("auth")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const form = useForm<ChangePasswordFormType>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  })

  const { isSubmitting } = form.formState
  const isDisabled = isSubmitting

  async function onSubmit(data: ChangePasswordFormType) {
    setError("")
    setSuccess("")

    try {
      const result = await forcedPasswordChange({
        email: email,
        current_password: data.current_password,
        new_password: data.new_password,
      })

      setSuccess("Password changed successfully! Redirecting...")

      // Call the callback with the token
      const token = result.token
      if (token) {
        setTimeout(() => {
          onPasswordChanged(token)
        }, 1500)
      }
    } catch (err: unknown) {
      console.error("Password change error:", err)
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { data?: { message?: string; error?: string } }
        }
        const message =
          axiosError.response?.data?.message ||
          axiosError.response?.data?.error ||
          "Failed to change password"
        setError(message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to change password. Please try again.")
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("passwordChangeRequired") || "You must change your password before continuing."}
          </AlertDescription>
        </Alert>

        {error && (
          <div className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-500/15 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="current_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("currentPassword") || "Current Password"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t("currentPasswordPlaceholder") || "Enter your temporary password"}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="new_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("newPassword") || "New Password"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t("newPasswordPlaceholder") || "Enter your new password"}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("confirmPassword") || "Confirm New Password"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t("confirmPasswordPlaceholder") || "Re-enter your new password"}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isDisabled} className="w-full">
          {isSubmitting ? t("changingPassword") || "Changing Password..." : t("changePassword") || "Change Password"}
        </Button>
      </form>
    </Form>
  )
}
