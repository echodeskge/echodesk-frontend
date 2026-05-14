"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, Play, RotateCcw, Volume2 } from "lucide-react";

import { useSocialSettings } from "@/hooks/api/useSocial";
import {
  NOTIFICATION_SOUNDS,
  NotificationPlatform,
  getNotificationSound,
} from "@/utils/notificationSound";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface PlatformRow {
  key: NotificationPlatform;
  label: string;
  dotColor: string;
  tenantField: keyof TenantSoundFields;
}

interface TenantSoundFields {
  notification_sound_facebook?: string;
  notification_sound_instagram?: string;
  notification_sound_whatsapp?: string;
  notification_sound_email?: string;
  notification_sound_widget?: string;
  notification_sound_team_chat?: string;
  notification_sound_system?: string;
}

/**
 * Per-user notification sound preferences. Values are stored locally in the
 * browser (via NotificationSoundManager / localStorage) and override the
 * tenant-wide defaults set by admins on /settings/social. Any user can edit
 * their own preferences without affecting teammates.
 */
export function UserNotificationSoundsCard() {
  const t = useTranslations("social");
  const { data: tenantSettings } = useSocialSettings();

  // Local mirror of the manager's user overrides, so the UI is reactive.
  const [overrides, setOverrides] = useState<Partial<Record<NotificationPlatform, string>>>({});
  const [soundsEnabled, setSoundsEnabled] = useState(true);

  // Hydrate from the singleton on mount + whenever the tenant defaults change,
  // so the displayed selection reflects "user override OR tenant default".
  useEffect(() => {
    const mgr = getNotificationSound();
    const next: Partial<Record<NotificationPlatform, string>> = {};
    (["facebook", "instagram", "whatsapp", "email", "widget", "team_chat", "system"] as NotificationPlatform[]).forEach(
      (platform) => {
        const override = mgr.getUserSoundForPlatform(platform);
        if (override) next[platform] = override;
      }
    );
    setOverrides(next);
    setSoundsEnabled(mgr.isEnabled());
  }, [tenantSettings]);

  const tenant = (tenantSettings || {}) as TenantSoundFields;

  const effective = useCallback(
    (platform: NotificationPlatform, tenantField: keyof TenantSoundFields): string => {
      return overrides[platform] || tenant[tenantField] || NOTIFICATION_SOUNDS[0].value;
    },
    [overrides, tenant]
  );

  const handleSoundChange = useCallback((platform: NotificationPlatform, value: string) => {
    getNotificationSound().setUserSoundForPlatform(platform, value);
    setOverrides((prev) => ({ ...prev, [platform]: value }));
  }, []);

  const handleReset = useCallback(() => {
    getNotificationSound().clearUserSoundOverrides();
    setOverrides({});
  }, []);

  const handleToggleSounds = useCallback((checked: boolean) => {
    const mgr = getNotificationSound();
    if (checked) mgr.enable();
    else mgr.disable();
    setSoundsEnabled(checked);
  }, []);

  const previewSound = useCallback((soundFile: string) => {
    getNotificationSound().preview(soundFile);
  }, []);

  const rows: PlatformRow[] = [
    {
      key: "facebook",
      label: t("settingsPage.notificationSounds.facebook") || "Facebook",
      dotColor: "text-blue-600",
      tenantField: "notification_sound_facebook",
    },
    {
      key: "instagram",
      label: t("settingsPage.notificationSounds.instagram") || "Instagram",
      dotColor: "text-pink-600",
      tenantField: "notification_sound_instagram",
    },
    {
      key: "whatsapp",
      label: t("settingsPage.notificationSounds.whatsapp") || "WhatsApp",
      dotColor: "text-green-600",
      tenantField: "notification_sound_whatsapp",
    },
    {
      key: "email",
      label: t("settingsPage.notificationSounds.email") || "Email",
      dotColor: "text-red-600",
      tenantField: "notification_sound_email",
    },
    {
      key: "widget",
      label: t("settingsPage.notificationSounds.widget") || "Website widget",
      dotColor: "text-indigo-600",
      tenantField: "notification_sound_widget",
    },
    {
      key: "team_chat",
      label: t("settingsPage.notificationSounds.teamChat") || "Team Chat",
      dotColor: "text-purple-600",
      tenantField: "notification_sound_team_chat",
    },
    {
      key: "system",
      label: t("settingsPage.notificationSounds.system") || "System",
      dotColor: "text-gray-600",
      tenantField: "notification_sound_system",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("settingsPage.notifications.title") || "Notifications"}
          </CardTitle>
          <CardDescription>
            {t("settingsPage.notifications.description")
              || "Manage notification preferences for new messages"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="user-notification-sound">
                {t("settingsPage.notifications.sound") || "Notification sound"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("settingsPage.notifications.soundDescription")
                  || "Play sound when new message arrives"}
              </p>
            </div>
            <Switch
              id="user-notification-sound"
              checked={soundsEnabled}
              onCheckedChange={handleToggleSounds}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              {t("settingsPage.notificationSounds.title") || "Notification Sounds"}
            </CardTitle>
            <CardDescription>
              {t("settingsPage.notificationSounds.description")
                || "Customize notification sounds for each platform"}
            </CardDescription>
          </div>
          {Object.keys(overrides).length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="self-end sm:self-auto"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to defaults
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((row, idx) => {
            const value = effective(row.key, row.tenantField);
            return (
              <div key={row.key}>
                {idx > 0 && <Separator className="mb-4" />}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label className="flex items-center gap-2">
                    <span className={row.dotColor}>&#9679;</span>
                    {row.label}
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={value}
                      onValueChange={(v) => handleSoundChange(row.key, v)}
                    >
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTIFICATION_SOUNDS.map((sound) => (
                          <SelectItem key={sound.value} value={sound.value}>
                            {sound.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => previewSound(value)}
                      aria-label="Preview sound"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
