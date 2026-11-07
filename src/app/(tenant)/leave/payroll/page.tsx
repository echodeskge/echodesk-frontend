"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FeatureGate } from "../_components/FeatureGate"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { ReportTab } from "./_components/ReportTab"
import { SalariesTab } from "./_components/SalariesTab"
import { RatesTab } from "./_components/RatesTab"
import { WorkedDaysTab } from "./_components/WorkedDaysTab"

type TabKey = "report" | "salaries" | "rates" | "worked"

export default function PayrollPage() {
  const t = useTranslations("leave")
  const { loaded, features, isStaff } = useLeaveFeatures()
  const payrollOn = Boolean(features?.payroll)
  const substitutionPayOn = Boolean(features?.substitution_pay)

  const tabs: TabKey[] = [
    ...(payrollOn ? (["report", "salaries"] as TabKey[]) : []),
    ...(substitutionPayOn ? (["rates", "worked"] as TabKey[]) : []),
  ]
  const [tab, setTab] = useState<TabKey | null>(null)
  const active = tab && tabs.includes(tab) ? tab : tabs[0]

  return (
    <FeatureGate loaded={loaded} allowed={Boolean(features?.can_manage_payroll) && tabs.length > 0}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("hr.payroll.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("hr.payroll.description")}</p>
        </div>
        <Tabs value={active} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="flex-wrap h-auto">
            {tabs.map((key) => (
              <TabsTrigger key={key} value={key}>
                {t(`hr.payroll.tabs.${key}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {payrollOn && (
            <TabsContent value="report" className="mt-4">
              <ReportTab isStaff={isStaff} />
            </TabsContent>
          )}
          {payrollOn && (
            <TabsContent value="salaries" className="mt-4">
              <SalariesTab />
            </TabsContent>
          )}
          {substitutionPayOn && (
            <TabsContent value="rates" className="mt-4">
              <RatesTab />
            </TabsContent>
          )}
          {substitutionPayOn && (
            <TabsContent value="worked" className="mt-4">
              <WorkedDaysTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </FeatureGate>
  )
}
