"use client"

import React, { useState, useEffect } from 'react'
import { Volume2, VolumeX, Bell, Smartphone, Check, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getNotificationSound } from '@/utils/notificationSound'
import { useWebPush } from '@/hooks/useWebPush'
import { useTranslations } from 'next-intl'

export function NotificationSettings() {
  const t = useTranslations('notificationPreferences')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(50)
  const soundManager = getNotificationSound()

  // Web Push notifications
  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
    sendTestNotification,
    error: pushError,
  } = useWebPush()

  // Load current settings on mount
  useEffect(() => {
    setSoundEnabled(soundManager.isEnabled())
    setVolume(soundManager.getVolume() * 100)
  }, [])

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled)
    if (enabled) {
      soundManager.enable()
    } else {
      soundManager.disable()
    }
  }

  const handleVolumeChange = (values: number[]) => {
    const newVolume = values[0]
    setVolume(newVolume)
    soundManager.setVolume(newVolume / 100)
  }

  const handleTestSound = () => {
    soundManager.play()
  }

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribeToPush()
    } else {
      await unsubscribeFromPush()
    }
  }

  const handleTestPush = async () => {
    await sendTestNotification()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('settings.title')}
        </CardTitle>
        <CardDescription>
          {t('settings.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-enabled" className="text-base font-medium">
              {t('settings.sound')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('settings.soundDesc')}
            </p>
          </div>
          <Switch
            id="sound-enabled"
            checked={soundEnabled}
            onCheckedChange={handleSoundToggle}
          />
        </div>

        {/* Volume Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="volume" className="text-base font-medium">
              {t('settings.volume')}
            </Label>
            <span className="text-sm text-muted-foreground">{volume}%</span>
          </div>
          <div className="flex items-center gap-3">
            {volume === 0 ? (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Volume2 className="h-5 w-5 text-muted-foreground" />
            )}
            <Slider
              id="volume"
              min={0}
              max={100}
              step={5}
              value={[volume]}
              onValueChange={handleVolumeChange}
              disabled={!soundEnabled}
              className="flex-1"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestSound}
            disabled={!soundEnabled}
            className="w-full"
          >
            {t('settings.testSound')}
          </Button>
        </div>

        {/* Browser Notifications Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t('settings.browserNotifications')}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {t('settings.browserNotificationsDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Web Push Notifications */}
        {isPushSupported && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="push-enabled" className="text-base font-medium">
                    {t('settings.pushNotifications')}
                  </Label>
                  {isPushSubscribed && (
                    <Badge variant="default" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      {t('settings.active')}
                    </Badge>
                  )}
                  {pushPermission === 'denied' && (
                    <Badge variant="destructive" className="text-xs">
                      <X className="h-3 w-3 mr-1" />
                      {t('settings.blocked')}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('settings.pushDesc')}
                </p>
              </div>
              <Switch
                id="push-enabled"
                checked={isPushSubscribed}
                onCheckedChange={handlePushToggle}
                disabled={isPushLoading || pushPermission === 'denied'}
              />
            </div>

            {/* Push Notification Status */}
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">
                  {pushPermission === 'granted' && isPushSubscribed && t('settings.pushEnabled')}
                  {pushPermission === 'granted' && !isPushSubscribed && t('settings.pushAvailable')}
                  {pushPermission === 'denied' && t('settings.pushBlocked')}
                  {pushPermission === 'default' && t('settings.pushRequiresPermission')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pushPermission === 'granted' && isPushSubscribed && t('settings.pushEnabledDesc')}
                  {pushPermission === 'granted' && !isPushSubscribed && t('settings.pushAvailableDesc')}
                  {pushPermission === 'denied' && t('settings.pushBlockedDesc')}
                  {pushPermission === 'default' && t('settings.pushDefaultDesc')}
                </p>
              </div>
            </div>

            {/* Test Push Notification Button */}
            {isPushSubscribed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestPush}
                disabled={isPushLoading}
                className="w-full"
              >
                {isPushLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('settings.sending')}
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    {t('settings.testPush')}
                  </>
                )}
              </Button>
            )}

            {/* Error Message */}
            {pushError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive">{pushError.message}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
