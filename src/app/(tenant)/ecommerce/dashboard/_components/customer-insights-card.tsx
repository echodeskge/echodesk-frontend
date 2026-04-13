"use client"

import { Users, UserPlus, UserCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CustomerInsightsCardProps {
  insights: {
    total: number
    new: number
    returning: number
  }
  t: (key: string) => string
}

export function CustomerInsightsCard({ insights, t }: CustomerInsightsCardProps) {
  const items = [
    {
      icon: Users,
      label: t("customerInsights.total"),
      value: insights.total,
      color: "bg-blue-100 text-blue-700",
    },
    {
      icon: UserPlus,
      label: t("customerInsights.new"),
      value: insights.new,
      color: "bg-green-100 text-green-700",
    },
    {
      icon: UserCheck,
      label: t("customerInsights.returning"),
      value: insights.returning,
      color: "bg-purple-100 text-purple-700",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("customerInsights.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className={`h-10 w-10 shrink-0 items-center justify-center rounded-lg p-0 ${item.color}`}
              >
                <item.icon className="h-5 w-5" />
              </Badge>
              <div>
                <p className="text-2xl font-bold">{item.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
