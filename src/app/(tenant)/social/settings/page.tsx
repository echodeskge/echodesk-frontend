"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Bell, MessageSquare, Clock, User, Loader2, Users, Play, EyeOff, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialSettings, useUpdateSocialSettings } from "@/hooks/api/useSocial";
import { EmailSignatureSettings } from "@/components/social/EmailSignatureSettings";

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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // in seconds
  const [notifications, setNotifications] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [autoAssign, setAutoAssign] = useState(false);

  // Chat management settings (separate toggles)
  const [chatAssignmentEnabled, setChatAssignmentEnabled] = useState(false);
  const [sessionManagementEnabled, setSessionManagementEnabled] = useState(false);
  const [hideAssignedChats, setHideAssignedChats] = useState(false);
  const [collectCustomerRating, setCollectCustomerRating] = useState(false);

  // Sync local state with query data when it loads
  useEffect(() => {
    if (settings) {
      // Convert milliseconds to seconds for display
      setRefreshInterval(Math.round(settings.refresh_interval / 1000));
      setChatAssignmentEnabled(settings.chat_assignment_enabled ?? false);
      setSessionManagementEnabled(settings.session_management_enabled ?? false);
      setHideAssignedChats(settings.hide_assigned_chats ?? false);
      setCollectCustomerRating(settings.collect_customer_rating ?? false);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    // Convert seconds to milliseconds for backend
    const refreshIntervalMs = refreshInterval * 1000;

    const payload = {
      refresh_interval: refreshIntervalMs,
      chat_assignment_enabled: Boolean(chatAssignmentEnabled),
      session_management_enabled: Boolean(sessionManagementEnabled),
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
          {t("settings") || "Social Media Settings"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("settingsDescription") || "Configure how social media integrations work"}
        </p>
      </div>

      <div className="space-y-6">
        {/* Message Refresh Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Refresh
            </CardTitle>
            <CardDescription>
              Configure how often messages are refreshed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-refresh">Auto-refresh messages</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically check for new messages
                </p>
              </div>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>

            {autoRefresh && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="refresh-interval" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Refresh interval (seconds)
                  </Label>
                  <Input
                    id="refresh-interval"
                    type="number"
                    min="3"
                    max="60"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    Recommended: 5-10 seconds for best performance
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage notification preferences for new messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Enable notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications for new messages
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
                    <Label htmlFor="notification-sound">Notification sound</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound when new message arrives
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
                Chat Management
              </CardTitle>
              <CardDescription>
                Configure chat assignment, sessions, and customer ratings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Chat Assignment Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="chat-assignment" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Enable chat assignment
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to claim and assign chats to themselves
                  </p>
                </div>
                <Switch
                  id="chat-assignment"
                  checked={chatAssignmentEnabled}
                  onCheckedChange={setChatAssignmentEnabled}
                />
              </div>

              <Separator />

              {/* Session Management Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="session-management" className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-green-500" />
                    Enable session management
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to start and end chat sessions
                  </p>
                </div>
                <Switch
                  id="session-management"
                  checked={sessionManagementEnabled}
                  onCheckedChange={setSessionManagementEnabled}
                />
              </div>

              <Separator />

              {/* Hide Assigned Chats Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="hide-assigned" className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4 text-orange-500" />
                    Hide assigned chats from others
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, assigned chats are hidden from other users (admins can still see all)
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
                    Collect customer rating
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send rating request (1-5) to customer when session ends
                  </p>
                </div>
                <Switch
                  id="collect-rating"
                  checked={collectCustomerRating}
                  onCheckedChange={setCollectCustomerRating}
                />
              </div>

              {/* Info box showing enabled features */}
              {(chatAssignmentEnabled || sessionManagementEnabled || hideAssignedChats || collectCustomerRating) && (
                <>
                  <Separator />
                  <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium">Enabled features:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      {chatAssignmentEnabled && (
                        <li>Users can click &ldquo;Assign to Me&rdquo; from the chat menu to claim conversations</li>
                      )}
                      {sessionManagementEnabled && (
                        <li>Users can &ldquo;Start Session&rdquo; and &ldquo;End Session&rdquo; for active support</li>
                      )}
                      {hideAssignedChats && (
                        <li>Assigned chats are hidden from other users (admins see all)</li>
                      )}
                      {collectCustomerRating && (
                        <li>When session ends, customer receives rating request (1-5)</li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Email Signature Settings - Superadmin Only */}
        {isSuperAdmin && <EmailSignatureSettings />}

        {/* Auto Assignment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Automatic Assignment
            </CardTitle>
            <CardDescription>
              Configure automatic assignment of conversations to agents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-assign">Auto-assign conversations</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign new conversations to available agents
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
                  <Label>Assignment method</Label>
                  <p className="text-sm text-muted-foreground">
                    Coming soon: Round-robin, load-based, and manual assignment
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => window.history.back()} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
