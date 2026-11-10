"use client"

import React, { useState, useEffect } from 'react'
import { Volume2, VolumeX, Bell, Smartphone, Check, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { TonePill } from '@/components/redesign/pill'
import {
  ActionButton,
  FieldRow,
  SettingsNote,
  SettingsSection,
  SettingsToggle,
} from '@/components/redesign/settings'
import { getNotificationSound } from '@/utils/notificationSound'
import { useWebPush } from '@/hooks/useWebPush'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

export function NotificationSettings({
  variant = 'card',
}: {
  /** `settings`: design form section (settings shell); `card`: standalone card (preferences page). */
  variant?: 'card' | 'settings'
} = {}) {
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
    const sent = await sendTestNotification()
    if (sent) {
      toast.success(t('settings.testPushSent'))
    } else {
      toast.error(t('settings.testPushFailed'))
    }
  }

  const rows = (
    <>
      {/* Sound Toggle */}
      <FieldRow label={t('settings.sound')} help={t('settings.soundDesc')} htmlFor="sound-enabled" align="center">
        <SettingsToggle
          id="sound-enabled"
          checked={soundEnabled}
          onCheckedChange={handleSoundToggle}
        />
      </FieldRow>

      {/* Volume Slider */}
      <FieldRow label={t('settings.volume')} htmlFor="volume" disabled={!soundEnabled} align="center">
        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:w-[300px] sm:flex-nowrap">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {volume === 0 ? (
              <VolumeX className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
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
            <span className="w-9 shrink-0 text-end text-xs tabular-nums text-muted-foreground">{volume}%</span>
          </div>
          <ActionButton onClick={handleTestSound} disabled={!soundEnabled} testId="notifications-test-sound">
            {t('settings.testSound')}
          </ActionButton>
        </div>
      </FieldRow>

      {/* Browser Notifications Info */}
      <div className="border-b px-4 py-3.5 last:border-b-0">
        <SettingsNote tone="info" icon={Bell}>
          <span className="block font-medium">{t('settings.browserNotifications')}</span>
          <span className="block">{t('settings.browserNotificationsDesc')}</span>
        </SettingsNote>
      </div>

      {/* Web Push Notifications */}
      {isPushSupported && (
        <>
          <FieldRow
            label={
              <span className="inline-flex flex-wrap items-center gap-2">
                {t('settings.pushNotifications')}
                {isPushSubscribed && (
                  <TonePill tone="success">
                    <Check className="me-1 inline h-3 w-3 align-[-2px]" aria-hidden />
                    {t('settings.active')}
                  </TonePill>
                )}
                {pushPermission === 'denied' && (
                  <TonePill tone="danger">
                    <X className="me-1 inline h-3 w-3 align-[-2px]" aria-hidden />
                    {t('settings.blocked')}
                  </TonePill>
                )}
              </span>
            }
            help={t('settings.pushDesc')}
            htmlFor="push-enabled"
            align="center"
          >
            <SettingsToggle
              id="push-enabled"
              checked={isPushSubscribed}
              onCheckedChange={handlePushToggle}
              disabled={isPushLoading || pushPermission === 'denied'}
            />
          </FieldRow>

          {/* Push Notification Status (+ test button, error) */}
          <div className="flex flex-col gap-2.5 border-b px-4 py-3.5 last:border-b-0">
            <SettingsNote tone="neutral" icon={Smartphone}>
              <span className="block font-medium text-foreground">
                {pushPermission === 'granted' && isPushSubscribed && t('settings.pushEnabled')}
                {pushPermission === 'granted' && !isPushSubscribed && t('settings.pushAvailable')}
                {pushPermission === 'denied' && t('settings.pushBlocked')}
                {pushPermission === 'default' && t('settings.pushRequiresPermission')}
              </span>
              <span className="block">
                {pushPermission === 'granted' && isPushSubscribed && t('settings.pushEnabledDesc')}
                {pushPermission === 'granted' && !isPushSubscribed && t('settings.pushAvailableDesc')}
                {pushPermission === 'denied' && t('settings.pushBlockedDesc')}
                {pushPermission === 'default' && t('settings.pushDefaultDesc')}
              </span>
            </SettingsNote>

            {/* Test Push Notification Button */}
            {isPushSubscribed && (
              <ActionButton onClick={handleTestPush} disabled={isPushLoading} className="self-start" testId="notifications-test-push">
                {isPushLoading ? (
                  <>
                    <Loader2 className="h-[13px] w-[13px] animate-spin" aria-hidden />
                    {t('settings.sending')}
                  </>
                ) : (
                  <>
                    <Bell className="h-[13px] w-[13px]" aria-hidden />
                    {t('settings.testPush')}
                  </>
                )}
              </ActionButton>
            )}

            {/* Error Message */}
            {pushError && (
              <SettingsNote tone="danger">{pushError.message}</SettingsNote>
            )}
          </div>
        </>
      )}
    </>
  )

  // Inside the settings shell: a design form section. Elsewhere
  // (/preferences/notifications): the same rows in the original card.
  if (variant === 'settings') {
    return (
      <SettingsSection title={t('settings.title')} hint={t('settings.description')} testId="notification-settings">
        {rows}
      </SettingsSection>
    )
  }

  return (
    <Card data-testid="notification-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('settings.title')}
        </CardTitle>
        <CardDescription>
          {t('settings.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="border-t p-0">{rows}</CardContent>
    </Card>
  )
}
