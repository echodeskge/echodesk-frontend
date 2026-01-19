"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { TenantConfig } from "@/types/tenant"
import { AuthUser } from "@/types/auth"
import { authService } from "@/services/authService"

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

  const handlePasswordChanged = async (token: string) => {
    // After password change, we get a new token and need to fetch user data
    if (typeof window !== 'undefined') {
      // Store the token first
      localStorage.setItem('echodesk_auth_token', token)

      try {
        // Fetch user profile with the new token
        const user = await authService.getProfile()

        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          is_active: user.is_active,
          is_staff: user.is_staff,
          date_joined: user.date_joined
        }

        console.log('[SignIn] Password changed, syncing session...')

        // Sync to NextAuth session
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            userId: authUser.id,
            email: authUser.email,
            firstName: authUser.first_name,
            lastName: authUser.last_name,
            isStaff: authUser.is_staff,
            isActive: authUser.is_active,
            dateJoined: authUser.date_joined,
          }),
        })

        // Call onLogin to complete the flow
        onLogin(token, authUser)
      } catch (error) {
        console.error('[SignIn] Failed to fetch user after password change:', error)
        // Fallback: redirect to tickets page
        window.location.href = '/tickets'
      }
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