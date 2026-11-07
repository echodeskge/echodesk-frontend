"use client"

import { useTranslations } from "next-intl"
import { CheckCircle2, Clock, UserCheck, XCircle, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { leaveStatusKey, leaveStatusVariant } from "../_lib/hr-utils"

const ICONS: Record<string, LucideIcon> = {
  awaiting_substitutes: UserCheck,
  pending: Clock,
  manager_approved: CheckCircle2,
  hr_approved: CheckCircle2,
  approved: CheckCircle2,
  rejected: XCircle,
  cancelled: XCircle,
}

/** Status badge for a leave request (all statuses incl. awaiting_substitutes). */
export function LeaveStatusBadge({ status }: { status: string }) {
  const t = useTranslations("leave")
  const Icon = ICONS[status] || Clock
  return (
    <Badge variant={leaveStatusVariant(status)} className="flex items-center gap-1 w-fit">
      <Icon className="h-3 w-3" />
      {t(leaveStatusKey(status))}
    </Badge>
  )
}
