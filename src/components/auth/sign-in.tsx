"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { TenantConfig } from "@/types/tenant"
import { AuthUser } from "@/types/auth"

import {
  Auth,
  AuthDescription,
  AuthForm,
  AuthHeader,
  AuthTitle,
} from "./auth-layout"
import { SignInForm } from "./sign-in-form"
import { ForgotPasswordForm } from "./forgot-password-form"

interface SignInProps {
  tenant: TenantConfig
  onLogin: (token: string, user: AuthUser) => void
}

export function SignIn({ tenant, onLogin }: SignInProps) {
  const t = useTranslations("auth")
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const handleForgotPassword = () => {
    setShowForgotPassword(true)
  }

  const handleBackToSignIn = () => {
    setShowForgotPassword(false)
  }

  return (
    <Auth
      imgSrc="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=2072&auto=format&fit=crop"
      tenantName={tenant.tenant_name}
      tenantLogo={tenant.theme.logo_url}
    >
      <AuthHeader>
        <AuthTitle>
          {showForgotPassword ? t("resetPassword") : t("login")}
        </AuthTitle>
        <AuthDescription>
          {showForgotPassword
            ? t("resetPasswordDescription")
            : t("loginSubtitle")
          }
        </AuthDescription>
      </AuthHeader>
      <AuthForm>
        {showForgotPassword ? (
          <ForgotPasswordForm
            tenant={tenant}
            onBackToSignIn={handleBackToSignIn}
          />
        ) : (
          <SignInForm
            onLogin={onLogin}
            onForgotPassword={handleForgotPassword}
          />
        )}
      </AuthForm>
    </Auth>
  )
}