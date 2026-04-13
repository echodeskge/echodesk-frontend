"use client";

import { NotificationSettings } from "@/components/NotificationSettings";
import { NotificationPreferences } from "@/components/NotificationPreferences";

export default function PreferencesNotificationsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      <NotificationSettings />
      <NotificationPreferences />
    </div>
  );
}
