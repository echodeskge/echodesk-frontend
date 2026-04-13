import { format } from "date-fns"

export function formatCurrency(amount: string) {
  return `₾${parseFloat(amount).toFixed(2)}`
}

export function formatDate(dateString: string) {
  return format(new Date(dateString), "PP")
}

export function formatDateWithTime(dateString: string) {
  return format(new Date(dateString), "PP hh:mm a")
}
