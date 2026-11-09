"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { FeatureGate } from "../_components/FeatureGate"
import { MonthPicker } from "../_components/MonthPicker"
import { LeaveHeaderBridge, LeavePage, LeaveToolbar, Segmented } from "../_components/ui"
import { currentPeriod } from "../_lib/hr-utils"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { ReportTab } from "./_components/ReportTab"
import { SalariesTab } from "./_components/SalariesTab"
import { RatesTab } from "./_components/RatesTab"
import { WorkedDaysTab } from "./_components/WorkedDaysTab"

type TabKey = "report" | "salaries" | "rates" | "worked"

/** Tabs that read a payroll month (the month picker shows in the toolbar for these). */
const PERIOD_TABS: TabKey[] = ["report", "worked"]

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
  // One month for the report and worked-days tabs.
  const [period, setPeriod] = useState(currentPeriod())

  return (
    <FeatureGate loaded={loaded} allowed={Boolean(features?.can_manage_payroll) && tabs.length > 0} featureOn={tabs.length > 0}>
      <LeaveHeaderBridge breadcrumb={active ? t(`hr.payroll.tabs.${active}`) : null} />
      <LeavePage testId="payroll-page">
        <LeaveToolbar inset testId="payroll-toolbar">
          {tabs.length > 1 && (
            <Segmented
              ariaLabel={t("hr.payroll.tabsLabel")}
              value={active}
              onChange={setTab}
              options={tabs.map((key) => ({ value: key, label: t(`hr.payroll.tabs.${key}`) }))}
              testId="payroll-tabs"
            />
          )}
          {active && PERIOD_TABS.includes(active) && <MonthPicker value={period} onChange={setPeriod} />}
        </LeaveToolbar>
        {active === "report" && payrollOn && <ReportTab isStaff={isStaff} period={period} />}
        {active === "salaries" && payrollOn && <SalariesTab />}
        {active === "rates" && substitutionPayOn && <RatesTab />}
        {active === "worked" && substitutionPayOn && <WorkedDaysTab period={period} />}
      </LeavePage>
    </FeatureGate>
  )
}
