import { z } from "zod"

export const SignInSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

export type SignInFormType = z.infer<typeof SignInSchema>
export type ForgotPasswordFormType = z.infer<typeof ForgotPasswordSchema>