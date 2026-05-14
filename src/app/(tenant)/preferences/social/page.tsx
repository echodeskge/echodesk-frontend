"use client";

import { useTranslations } from "next-intl";

import { UserNotificationSoundsCard } from "@/components/preferences/UserNotificationSoundsCard";

/**
 * Per-user social preferences. Currently scoped to notification sounds —
 * anything tenant-wide (auto-reply, away hours, chat assignment, …) lives at
 * /settings/social and stays admin-only.
 *
 * Sound preferences are intentionally per-user (stored in localStorage) so
 * teammates don't overwrite each other's choices, and any user — not just
 * admins — can change them.
 */
export default function SocialPreferencesPage() {
  const t = useTranslations("social");

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("settingsPage.notifications.title") || "Notifications"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("settingsPage.notifications.description")
            || "Manage notification preferences for new messages"}
        </p>
      </div>
      <UserNotificationSoundsCard />
    </div>
  );
}
