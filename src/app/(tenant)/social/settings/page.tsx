"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell, User, Loader2, Users, EyeOff, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialSettings, useUpdateSocialSettings } from "@/hooks/api/useSocial";
import { EmailSyncDebug } from "@/components/social/EmailSyncDebug";

export default function SocialSettingsPage() {
  const t = useTranslations("social");
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user is superadmin (staff)
  const isSuperAdmin = user?.is_staff === true;

  // Use React Query hooks for settings
  const { data: settings, isLoading: loading } = useSocialSettings();
  const updateSettings = useUpdateSocialSettings();

  // Local state for settings (initialized from query data)
  const [notifications, setNotifications] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [autoAssign, setAutoAssign] = useState(false);

  // Chat management settings
  const [chatAssignmentEnabled, setChatAssignmentEnabled] = useState(false);
  const [hideAssignedChats, setHideAssignedChats] = useState(false);
  const [collectCustomerRating, setCollectCustomerRating] = useState(false);

  // Sync local state with query data when it loads
  useEffect(() => {
    if (settings) {
      setChatAssignmentEnabled(settings.chat_assignment_enabled ?? false);
      setHideAssignedChats(settings.hide_assigned_chats ?? false);
      setCollectCustomerRating(settings.collect_customer_rating ?? false);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    const payload = {
      chat_assignment_enabled: Boolean(chatAssignmentEnabled),
      // session_management_enabled is deprecated - session management is now part of chat assignment
      session_management_enabled: Boolean(chatAssignmentEnabled),
      hide_assigned_chats: Boolean(hideAssignedChats),
      collect_customer_rating: Boolean(collectCustomerRating),
    };

    updateSettings.mutate(payload, {
      onSuccess: () => {
        toast({
          title: "Settings saved",
          description: "Your social media settings have been updated successfully.",
        });
      },
      onError: (error: any) => {
        console.error("Failed to save settings:", error);
        toast({
          title: "Error saving settings",
          description: error.response?.data?.error || "Failed to update settings. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const saving = updateSettings.isPending;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {t("settingsPage.title") || t("settings") || "Social Media Settings"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("settingsPage.description") || t("settingsDescription") || "Configure how social media integrations work"}
        </p>
      </div>

      <div className="space-y-6">
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("settingsPage.notifications.title") || "Notifications"}
            </CardTitle>
            <CardDescription>
              {t("settingsPage.notifications.description") || "Manage notification preferences for new messages"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">{t("settingsPage.notifications.enable") || "Enable notifications"}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settingsPage.notifications.enableDescription") || "Show notifications for new messages"}
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            {notifications && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notification-sound">{t("settingsPage.notifications.sound") || "Notification sound"}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settingsPage.notifications.soundDescription") || "Play sound when new message arrives"}
                    </p>
                  </div>
                  <Switch
                    id="notification-sound"
                    checked={notificationSound}
                    onCheckedChange={setNotificationSound}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Chat Management Settings - Superadmin Only */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("settingsPage.chatManagement.title") || "Chat Management"}
              </CardTitle>
              <CardDescription>
                {t("settingsPage.chatManagement.description") || "Configure chat assignment, sessions, and customer ratings"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Chat Assignment Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="chat-assignment" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    {t("settingsPage.chatManagement.enableAssignment") || "Enable chat assignment"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settingsPage.chatManagement.enableAssignmentDescription") || "Allow users to claim chats and manage sessions. Only the assigned user will receive notifications for that chat."}
                  </p>
                </div>
                <Switch
                  id="chat-assignment"
                  checked={chatAssignmentEnabled}
                  onCheckedChange={setChatAssignmentEnabled}
                />
              </div>

              <Separator />

              {/* Hide Assigned Chats Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="hide-assigned" className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4 text-orange-500" />
                    {t("settingsPage.chatManagement.hideAssigned") || "Hide assigned chats from others"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settingsPage.chatManagement.hideAssignedDescription") || "When enabled, assigned chats are hidden from other users (admins can still see all)"}
                  </p>
                </div>
                <Switch
                  id="hide-assigned"
                  checked={hideAssignedChats}
                  onCheckedChange={setHideAssignedChats}
                />
              </div>

              <Separator />

              {/* Collect Customer Rating Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="collect-rating" className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {t("settingsPage.chatManagement.collectRating") || "Collect customer rating"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settingsPage.chatManagement.collectRatingDescription") || "Send rating request (1-5) to customer when session ends"}
                  </p>
                </div>
                <Switch
                  id="collect-rating"
                  checked={collectCustomerRating}
                  onCheckedChange={setCollectCustomerRating}
                />
              </div>

              {/* Info box showing enabled features */}
              {(chatAssignmentEnabled || hideAssignedChats || collectCustomerRating) && (
                <>
                  <Separator />
                  <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium">{t("settingsPage.enabledFeatures.title") || "Enabled features:"}</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      {chatAssignmentEnabled && (
                        <>
                          <li>{t("settingsPage.enabledFeatures.assignToMe") || 'Users can click "Assign to Me" from the chat menu to claim conversations'}</li>
                          <li>{t("settingsPage.enabledFeatures.startEndSession") || 'Users can "Start Session" and "End Session" for active support'}</li>
                          <li>{t("settingsPage.enabledFeatures.assignedNotifications") || "Only assigned user receives notifications for that chat (others see 0 unread)"}</li>
                          <li>{t("settingsPage.enabledFeatures.sessionEndNotifications") || "When session ends, notifications return to all users"}</li>
                        </>
                      )}
                      {hideAssignedChats && (
                        <li>{t("settingsPage.enabledFeatures.hiddenChats") || "Assigned chats are hidden from other users (admins see all)"}</li>
                      )}
                      {collectCustomerRating && (
                        <li>{t("settingsPage.enabledFeatures.ratingRequest") || "When session ends, customer receives rating request (1-5)"}</li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Email Sync Debug - Superadmin Only */}
        {isSuperAdmin && <EmailSyncDebug />}

        {/* Auto Assignment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("settingsPage.autoAssignment.title") || "Automatic Assignment"}
            </CardTitle>
            <CardDescription>
              {t("settingsPage.autoAssignment.description") || "Configure automatic assignment of conversations to agents"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-assign">{t("settingsPage.autoAssignment.enable") || "Auto-assign conversations"}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settingsPage.autoAssignment.enableDescription") || "Automatically assign new conversations to available agents"}
                </p>
              </div>
              <Switch
                id="auto-assign"
                checked={autoAssign}
                onCheckedChange={setAutoAssign}
              />
            </div>

            {autoAssign && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>{t("settingsPage.autoAssignment.method") || "Assignment method"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settingsPage.autoAssignment.methodDescription") || "Coming soon: Round-robin, load-based, and manual assignment"}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => window.history.back()} disabled={saving}>
            {t("settingsPage.cancel") || "Cancel"}
          </Button>
          <Button onClick={handleSaveSettings} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? (t("settingsPage.saving") || "Saving...") : (t("settingsPage.saveSettings") || "Save Settings")}
          </Button>
        </div>
      </div>
    </div>
  );
}
