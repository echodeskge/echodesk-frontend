import { toast as sonnerToast } from "sonner"

export interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    if (variant === "destructive") {
      sonnerToast.error(title || description || "An error occurred", {
        description: title && description ? description : undefined,
      })
    } else {
      sonnerToast.success(title || description || "Success", {
        description: title && description ? description : undefined,
      })
    }
  }

  return { toast }
}
