"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Bell, MessageSquare, Clock, User, Loader2, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import axios from "@/api/axios";

export default function SocialSettingsPage() {
  const t = useTranslations("social");
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user is superadmin (staff)
  const isSuperAdmin = user?.is_staff === true;

  // State for settings
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // in seconds
  const [notifications, setNotifications] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [autoAssign, setAutoAssign] = useState(false);
  const [chatAssignmentEnabled, setChatAssignmentEnabled] = useState(false);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await axios.get("/api/social/settings/");
        const data = response.data;

        console.log("Loaded settings from backend:", data);

        // Convert milliseconds to seconds for display
        setRefreshInterval(Math.round(data.refresh_interval / 1000));
        setChatAssignmentEnabled(data.chat_assignment_enabled ?? false);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load settings:", error);
        setLoading(false);
      }
    };

    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Convert seconds to milliseconds for backend
      const refreshIntervalMs = refreshInterval * 1000;

      const payload = {
        refresh_interval: refreshIntervalMs,
        chat_assignment_enabled: Boolean(chatAssignmentEnabled),
      };

      console.log("Saving settings:", payload, "chatAssignmentEnabled state:", chatAssignmentEnabled);

      await axios.patch("/api/social/settings/", payload);

      toast({
        title: "Settings saved",
        description: "Your social media settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error saving settings",
        description: error.response?.data?.error || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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

        {/* Chat Assignment Mode - Superadmin Only */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Chat Assignment Mode
              </CardTitle>
              <CardDescription>
                Enable manual chat assignment and session management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="chat-assignment-mode">Enable chat assignment mode</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, users can claim chats, start/end sessions, and collect customer ratings.
                    Assigned chats are hidden from other users (except admins).
                  </p>
                </div>
                <Switch
                  id="chat-assignment-mode"
                  checked={chatAssignmentEnabled}
                  onCheckedChange={(checked) => {
                    console.log("Switch toggled to:", checked);
                    setChatAssignmentEnabled(checked);
                  }}
                />
              </div>

              {chatAssignmentEnabled && (
                <>
                  <Separator />
                  <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium">How it works:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Users see an &ldquo;Assigned to Me&rdquo; tab in the chat sidebar</li>
                      <li>Click &ldquo;Assign to Me&rdquo; from the chat menu to claim a conversation</li>
                      <li>&ldquo;Start Session&rdquo; to begin actively helping a customer</li>
                      <li>&ldquo;End Session&rdquo; sends a rating request (1-5) to the customer</li>
                      <li>Customer&apos;s numeric reply is captured as their rating</li>
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

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
