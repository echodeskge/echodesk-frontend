"use client"

import { useState } from "react"
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
          {showForgotPassword ? "Reset Password" : "Sign In"}
        </AuthTitle>
        <AuthDescription>
          {showForgotPassword
            ? "Enter your email address and we'll send you a link to reset your password"
            : "Enter your email below to sign in to your account"
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