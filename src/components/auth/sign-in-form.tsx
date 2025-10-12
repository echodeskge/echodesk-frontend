"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import Link from "next/link"

import { SignInSchema, type SignInFormType } from "@/schemas/auth"
import { authService, LoginCredentials } from "@/services/authService"
import { AuthUser } from "@/types/auth"

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

interface SignInFormProps {
  onLogin: (token: string, user: AuthUser) => void
  onForgotPassword: () => void
}

export function SignInForm({ onLogin, onForgotPassword }: SignInFormProps) {
  const t = useTranslations("auth")
  const tCommon = useTranslations("common")
  const [error, setError] = useState("")

  const form = useForm<SignInFormType>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const { isSubmitting } = form.formState
  const isDisabled = isSubmitting

  async function onSubmit(data: SignInFormType) {
    const { email, password } = data
    setError("")

    try {
      const credentials: LoginCredentials = { email, password }
      const loginResponse = await authService.login(credentials)
      const token = loginResponse.token

      if (token) {
        const storedUser = authService.getUser()
        if (storedUser) {
          const authUser: AuthUser = {
            id: storedUser.id,
            email: storedUser.email,
            first_name: storedUser.first_name,
            last_name: storedUser.last_name,
            is_active: storedUser.is_active,
            is_staff: storedUser.is_staff,
            date_joined: storedUser.date_joined
          }
          onLogin(token, authUser)
        } else {
          const fallbackUser: AuthUser = {
            id: 0,
            email: email,
            first_name: "",
            last_name: "",
            is_active: true,
            is_staff: false,
            date_joined: new Date().toISOString()
          }
          onLogin(token, fallbackUser)
        }
      } else {
        setError(t("invalidResponse"))
      }
    } catch (err: unknown) {
      console.error("Login error:", err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(t("networkError"))
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        {error && (
          <div className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4">
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center">
                  <FormLabel>{t("password")}</FormLabel>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="ms-auto inline-block text-sm underline hover:no-underline"
                  >
                    {t("forgotPassword")}
                  </button>
                </div>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isDisabled} className="w-full">
          {isSubmitting ? t("signingIn") : t("signInWithEmail")}
        </Button>

        <div className="-mt-4 text-center text-sm">
          {t("noAccount")}{" "}
          <Link href="/register" className="underline hover:no-underline">
            {t("signUp")}
          </Link>
        </div>
      </form>
    </Form>
  )
}