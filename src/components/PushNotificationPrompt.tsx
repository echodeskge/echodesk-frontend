"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "push_notification_prompt_dismissed";

export function PushNotificationPrompt() {
  const t = useTranslations("common");
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if:
    // 1. Already dismissed
    // 2. Notifications not supported
    // 3. Permission already granted or denied
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    if (Notification.permission === "granted" || Notification.permission === "denied") return;

    // Show prompt after 3 seconds so it doesn't interrupt initial page load
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        // Auto-subscribe will be handled by useWebPush's autoSubscribe
        localStorage.setItem(DISMISSED_KEY, "enabled");
      } else {
        localStorage.setItem(DISMISSED_KEY, "denied");
      }
    } catch {
      localStorage.setItem(DISMISSED_KEY, "error");
    }
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "dismissed");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
    >
      <div className="bg-background border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {t("pushPrompt.title") || "Enable Notifications"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("pushPrompt.description") || "Get notified about new tickets, updates and important events even when you're not on this page."}
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="h-7 text-xs" onClick={handleEnable}>
                {t("pushPrompt.enable") || "Enable"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleDismiss}
              >
                {t("pushPrompt.notNow") || "Not now"}
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
