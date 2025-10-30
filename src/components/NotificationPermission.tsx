"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, Check, X } from "lucide-react";
import { toast } from "sonner";

export function NotificationPermission() {
  const t = useTranslations('notifications');
  const { permission, isSupported, isSubscribed, requestPermission, unsubscribe, sendTestNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);

  if (!isSupported) {
    return null; // Don't show anything if notifications aren't supported
  }

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const success = await requestPermission();
      if (success) {
        toast.success(t('enabled'));
      } else {
        toast.error(t('enableError'));
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error(t('enableError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      const success = await unsubscribe();
      if (success) {
        toast.success(t('disabled'));
      } else {
        toast.error(t('disableError'));
      }
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error(t('disableError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      toast.success(t('testSent'));
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error(t('testError'));
    }
  };

  if (permission === 'denied') {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-destructive" />
            {t('blocked')}
          </CardTitle>
          <CardDescription>{t('blockedDescription')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (permission === 'granted' && isSubscribed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            {t('enabled')}
          </CardTitle>
          <CardDescription>{t('enabledDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={handleTestNotification}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Bell className="h-4 w-4 mr-2" />
            {t('sendTest')}
          </Button>
          <Button
            onClick={handleDisableNotifications}
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={isLoading}
          >
            <BellOff className="h-4 w-4 mr-2" />
            {t('disable')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleEnableNotifications}
          disabled={isLoading}
          className="w-full"
        >
          <Bell className="h-4 w-4 mr-2" />
          {isLoading ? t('enabling') : t('enable')}
        </Button>
      </CardContent>
    </Card>
  );
}
