"use client"

import React, { useState, useEffect } from 'react'
import { Volume2, VolumeX, Bell } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { getNotificationSound } from '@/utils/notificationSound'

export function NotificationSettings() {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(50)
  const soundManager = getNotificationSound()

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Customize how you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-enabled" className="text-base font-medium">
              Notification Sound
            </Label>
            <p className="text-sm text-muted-foreground">
              Play a sound when new notifications arrive
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
              Volume
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
            Test Sound
          </Button>
        </div>

        {/* Browser Notifications Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Browser Notifications
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                You'll receive desktop notifications even when this tab is not active. You can manage browser permissions in your browser settings.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
