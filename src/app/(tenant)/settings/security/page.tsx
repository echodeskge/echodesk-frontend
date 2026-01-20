"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Globe, History } from "lucide-react";
import { SecurityLogsTab } from "./_components/security-logs-tab";
import { IPWhitelistTab } from "./_components/ip-whitelist-tab";

export default function SecuritySettingsPage() {
  const t = useTranslations('settings.security');
  const [activeTab, setActiveTab] = useState("logs");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {t('tabs.logs')}
          </TabsTrigger>
          <TabsTrigger value="whitelist" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('tabs.whitelist')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-6">
          <SecurityLogsTab />
        </TabsContent>

        <TabsContent value="whitelist" className="mt-6">
          <IPWhitelistTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
