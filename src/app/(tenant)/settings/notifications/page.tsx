"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotificationSettings } from "@/components/NotificationSettings";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { SettingsFormPage } from "@/components/redesign/settings";

// Both sections save instantly (sound/push on the device, preferences via a
// debounced PUT), as before. /preferences/notifications renders the same
// components in their card variant.
export default function NotificationSettingsPage() {
  const t = useTranslations('settings');
  return (
    <SettingsFormPage
      icon={Bell}
      title={t('nav.notifications')}
      description={t('navDesc.notifications')}
      testId="settings-notifications"
    >
      <NotificationSettings variant="settings" />
      <NotificationPreferences variant="settings" />
    </SettingsFormPage>
  );
}
