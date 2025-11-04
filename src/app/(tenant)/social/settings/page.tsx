"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Bell, MessageSquare, Clock, User } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SocialSettingsPage() {
  const t = useTranslations("social");
  const { toast } = useToast();

  // State for settings
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [notifications, setNotifications] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [autoAssign, setAutoAssign] = useState(false);

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your social media settings have been updated successfully.",
    });
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

        {/* Assignment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Conversation Assignment
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
          <Button variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
