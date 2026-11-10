"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Shield, Globe, History } from "lucide-react";
import { Segmented } from "@/components/redesign/segmented";
import { SettingsPage } from "@/components/redesign/settings";
import { SecurityLogsTab } from "./_components/security-logs-tab";
import { IPWhitelistTab } from "./_components/ip-whitelist-tab";

type SecurityTab = "logs" | "whitelist";

export default function SecuritySettingsPage() {
  const t = useTranslations('settings.security');
  const [activeTab, setActiveTab] = useState<SecurityTab>("logs");

  return (
    <SettingsPage
      icon={Shield}
      title={t('title')}
      description={t('description')}
      width="wide"
      testId="settings-security"
    >
      <Segmented<SecurityTab>
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: "logs", label: t('tabs.logs'), icon: History },
          { value: "whitelist", label: t('tabs.whitelist'), icon: Globe },
        ]}
        ariaLabel={t('title')}
        className="self-start"
        testId="security-tabs"
      />

      {/* Only the active tab is mounted (as with the previous tabs). */}
      {activeTab === "logs" ? <SecurityLogsTab /> : <IPWhitelistTab />}
    </SettingsPage>
  );
}
