import { z } from "zod"

export const TextMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Message text cannot be empty")
    .max(5000, "Message text cannot exceed 5000 characters"),
})
