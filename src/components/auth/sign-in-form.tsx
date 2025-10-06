"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
        setError("Invalid response from server. Please try again.")
      }
    } catch (err: unknown) {
      console.error("Login error:", err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Network error. Please try again.")
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="name@example.com"
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
                  <FormLabel>Password</FormLabel>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="ms-auto inline-block text-sm underline hover:no-underline"
                  >
                    Forgot your password?
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
          {isSubmitting ? "Signing in..." : "Sign In with Email"}
        </Button>

        <div className="-mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="underline hover:no-underline">
            Sign up
          </Link>
        </div>
      </form>
    </Form>
  )
}