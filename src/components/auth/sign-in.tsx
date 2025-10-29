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
import { ChangePasswordForm } from "./change-password-form"

interface SignInProps {
  tenant: TenantConfig
  onLogin: (token: string, user: AuthUser) => void
}

export function SignIn({ tenant, onLogin }: SignInProps) {
  const t = useTranslations("auth")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordChangeData, setPasswordChangeData] = useState<{
    userId: number
    email: string
  } | null>(null)

  const handleForgotPassword = () => {
    setShowForgotPassword(true)
  }

  const handleBackToSignIn = () => {
    setShowForgotPassword(false)
  }

  const handlePasswordChangeRequired = (userId: number, email: string) => {
    setPasswordChangeData({ userId, email })
    setShowChangePassword(true)
    setShowForgotPassword(false)
  }

  const handlePasswordChanged = (token: string) => {
    // After password change, we get a new token and need to fetch user data
    // For now, we'll just store the token and redirect
    if (typeof window !== 'undefined') {
      localStorage.setItem('echodesk_auth_token', token)
      window.location.href = '/tickets'
    }
  }

  return (
    <Auth
      imgSrc="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=2072&auto=format&fit=crop"
      tenantName={tenant.tenant_name}
      tenantLogo={tenant.theme.logo_url}
    >
      <AuthHeader>
        <AuthTitle>
          {showChangePassword
            ? t("changePassword") || "Change Password"
            : showForgotPassword
            ? t("resetPassword")
            : t("login")}
        </AuthTitle>
        <AuthDescription>
          {showChangePassword
            ? t("changePasswordDescription") || "Please set a new password for your account"
            : showForgotPassword
            ? t("resetPasswordDescription")
            : t("loginSubtitle")}
        </AuthDescription>
      </AuthHeader>
      <AuthForm>
        {showChangePassword && passwordChangeData ? (
          <ChangePasswordForm
            userId={passwordChangeData.userId}
            email={passwordChangeData.email}
            onPasswordChanged={handlePasswordChanged}
          />
        ) : showForgotPassword ? (
          <ForgotPasswordForm
            tenant={tenant}
            onBackToSignIn={handleBackToSignIn}
          />
        ) : (
          <SignInForm
            onLogin={onLogin}
            onForgotPassword={handleForgotPassword}
            onPasswordChangeRequired={handlePasswordChangeRequired}
          />
        )}
      </AuthForm>
    </Auth>
  )
}