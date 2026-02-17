"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Bell, User, Loader2, Users, EyeOff, Star, Play, Volume2, Clock, MessageSquare, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialSettings, useUpdateSocialSettings, AutoReplySettings, AwayHoursSchedule, PlatformAutoReplySettings } from "@/hooks/api/useSocial";
import { EmailSyncDebug } from "@/components/social/EmailSyncDebug";
import { NOTIFICATION_SOUNDS, getNotificationSound } from "@/utils/notificationSound";

// Common timezones
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tbilisi', label: 'Tbilisi (Georgia)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Mumbai/New Delhi (IST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai/Beijing (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Default platform settings
const defaultPlatformSettings: PlatformAutoReplySettings = {
  welcome_enabled: false,
  welcome_message: '',
  away_enabled: false,
  away_message: '',
};

interface AwayHoursGridProps {
  schedule: AwayHoursSchedule;
  onChange: (schedule: AwayHoursSchedule) => void;
  disabled?: boolean;
}

function AwayHoursGrid({ schedule, onChange, disabled }: AwayHoursGridProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'select' | 'deselect'>('select');

  const isSelected = (day: string, hour: number) => {
    const daySchedule = schedule[day as keyof AwayHoursSchedule] || [];
    return daySchedule.includes(hour);
  };

  const toggleCell = (day: string, hour: number) => {
    if (disabled) return;
    const daySchedule = schedule[day as keyof AwayHoursSchedule] || [];
    const newDaySchedule = isSelected(day, hour)
      ? daySchedule.filter(h => h !== hour)
      : [...daySchedule, hour].sort((a, b) => a - b);
    onChange({ ...schedule, [day]: newDaySchedule });
  };

  const handleMouseDown = (day: string, hour: number) => {
    if (disabled) return;
    setIsSelecting(true);
    setSelectionMode(isSelected(day, hour) ? 'deselect' : 'select');
    toggleCell(day, hour);
  };

  const handleMouseEnter = (day: string, hour: number) => {
    if (!isSelecting || disabled) return;
    const shouldSelect = selectionMode === 'select';
    const currentlySelected = isSelected(day, hour);
    if (shouldSelect !== currentlySelected) {
      toggleCell(day, hour);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Hour headers */}
        <div className="flex mb-1">
          <div className="w-20 shrink-0" />
          <div className="flex flex-1 gap-px">
            {HOURS.map(hour => (
              <div key={hour} className="flex-1 text-center text-xs text-muted-foreground">
                {hour.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>

        {/* Day rows */}
        {DAYS.map(day => (
          <div key={day} className="flex mb-px">
            <div className="w-20 shrink-0 text-sm font-medium capitalize py-1">
              {day.substring(0, 3)}
            </div>
            <div className="flex flex-1 gap-px">
              {HOURS.map(hour => (
                <div
                  key={`${day}-${hour}`}
                  className={`
                    flex-1 h-6 rounded-sm cursor-pointer transition-colors select-none
                    ${isSelected(day, hour)
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-muted hover:bg-muted-foreground/20'
                    }
                    ${disabled ? 'cursor-not-allowed opacity-50' : ''}
                  `}
                  onMouseDown={() => handleMouseDown(day, hour)}
                  onMouseEnter={() => handleMouseEnter(day, hour)}
                  title={`${day.charAt(0).toUpperCase() + day.slice(1)} ${hour}:00 - ${hour + 1}:00`}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-muted" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-orange-500" />
            <span>Away (auto-reply active)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PlatformAutoReplyFormProps {
  platform: 'facebook' | 'instagram' | 'whatsapp';
  settings: PlatformAutoReplySettings;
  onChange: (settings: PlatformAutoReplySettings) => void;
}

function PlatformAutoReplyForm({ platform, settings, onChange }: PlatformAutoReplyFormProps) {
  const platformLabels = {
    facebook: 'Facebook Messenger',
    instagram: 'Instagram DMs',
    whatsapp: 'WhatsApp',
  };

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              Welcome Message
            </Label>
            <p className="text-sm text-muted-foreground">
              Sent to new conversations (if 12+ hours since last welcome)
            </p>
          </div>
          <Switch
            checked={settings.welcome_enabled}
            onCheckedChange={(checked) => onChange({ ...settings, welcome_enabled: checked })}
          />
        </div>
        {settings.welcome_enabled && (
          <Textarea
            placeholder={`Hello {{customer_name}}! Welcome to our ${platformLabels[platform]} support. How can we help you today?`}
            value={settings.welcome_message}
            onChange={(e) => onChange({ ...settings, welcome_message: e.target.value })}
            rows={3}
          />
        )}
      </div>

      <Separator />

      {/* Away Message */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Away Message
            </Label>
            <p className="text-sm text-muted-foreground">
              Sent during away hours (based on schedule above)
            </p>
          </div>
          <Switch
            checked={settings.away_enabled}
            onCheckedChange={(checked) => onChange({ ...settings, away_enabled: checked })}
          />
        </div>
        {settings.away_enabled && (
          <Textarea
            placeholder={`Hi {{customer_name}}! Thanks for reaching out. We're currently away but will respond as soon as we're back. Our business hours are Monday-Friday, 9 AM - 6 PM.`}
            value={settings.away_message}
            onChange={(e) => onChange({ ...settings, away_message: e.target.value })}
            rows={3}
          />
        )}
      </div>

      {/* Variable hint */}
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Available variables:</strong> Use <code className="bg-muted px-1 rounded">{"{{customer_name}}"}</code> to include the customer&apos;s name in your message.
        </p>
      </div>
    </div>
  );
}

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

  // Notification sound settings
  const [soundFacebook, setSoundFacebook] = useState('mixkit-bubble-pop-up-alert-notification-2357.wav');
  const [soundInstagram, setSoundInstagram] = useState('mixkit-magic-notification-ring-2344.wav');
  const [soundWhatsapp, setSoundWhatsapp] = useState('mixkit-positive-notification-951.wav');
  const [soundEmail, setSoundEmail] = useState('mixkit-bell-notification-933.wav');
  const [soundTeamChat, setSoundTeamChat] = useState('mixkit-happy-bells-notification-937.wav');
  const [soundSystem, setSoundSystem] = useState('mixkit-confirmation-tone-2867.wav');

  // Auto-reply settings
  const [timezone, setTimezone] = useState('UTC');
  const [awayHoursEnabled, setAwayHoursEnabled] = useState(false);
  const [awayHoursSchedule, setAwayHoursSchedule] = useState<AwayHoursSchedule>({});
  const [autoReplySettings, setAutoReplySettings] = useState<AutoReplySettings>({
    facebook: { ...defaultPlatformSettings },
    instagram: { ...defaultPlatformSettings },
    whatsapp: { ...defaultPlatformSettings },
  });

  // Sync local state with query data when it loads
  useEffect(() => {
    if (settings) {
      setChatAssignmentEnabled(settings.chat_assignment_enabled ?? false);
      setHideAssignedChats(settings.hide_assigned_chats ?? false);
      setCollectCustomerRating(settings.collect_customer_rating ?? false);
      // Notification sounds
      setSoundFacebook(settings.notification_sound_facebook || 'mixkit-bubble-pop-up-alert-notification-2357.wav');
      setSoundInstagram(settings.notification_sound_instagram || 'mixkit-magic-notification-ring-2344.wav');
      setSoundWhatsapp(settings.notification_sound_whatsapp || 'mixkit-positive-notification-951.wav');
      setSoundEmail(settings.notification_sound_email || 'mixkit-bell-notification-933.wav');
      setSoundTeamChat(settings.notification_sound_team_chat || 'mixkit-happy-bells-notification-937.wav');
      setSoundSystem(settings.notification_sound_system || 'mixkit-confirmation-tone-2867.wav');
      // Auto-reply settings
      setTimezone(settings.timezone || 'UTC');
      setAwayHoursEnabled(settings.away_hours_enabled ?? false);
      setAwayHoursSchedule(settings.away_hours_schedule || {});
      setAutoReplySettings({
        facebook: { ...defaultPlatformSettings, ...settings.auto_reply_settings?.facebook },
        instagram: { ...defaultPlatformSettings, ...settings.auto_reply_settings?.instagram },
        whatsapp: { ...defaultPlatformSettings, ...settings.auto_reply_settings?.whatsapp },
      });
      // Update the sound manager with backend settings
      getNotificationSound().updateSettings(settings);
    }
  }, [settings]);

  const previewSound = (soundFile: string) => {
    getNotificationSound().preview(soundFile);
  };

  const updatePlatformSettings = (platform: 'facebook' | 'instagram' | 'whatsapp', newSettings: PlatformAutoReplySettings) => {
    setAutoReplySettings(prev => ({
      ...prev,
      [platform]: newSettings,
    }));
  };

  const handleSaveSettings = () => {
    const payload = {
      chat_assignment_enabled: Boolean(chatAssignmentEnabled),
      // session_management_enabled is deprecated - session management is now part of chat assignment
      session_management_enabled: Boolean(chatAssignmentEnabled),
      hide_assigned_chats: Boolean(hideAssignedChats),
      collect_customer_rating: Boolean(collectCustomerRating),
      // Notification sound settings
      notification_sound_facebook: soundFacebook,
      notification_sound_instagram: soundInstagram,
      notification_sound_whatsapp: soundWhatsapp,
      notification_sound_email: soundEmail,
      notification_sound_team_chat: soundTeamChat,
      notification_sound_system: soundSystem,
      // Auto-reply settings
      timezone,
      away_hours_enabled: awayHoursEnabled,
      away_hours_schedule: awayHoursSchedule,
      auto_reply_settings: autoReplySettings,
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
        {/* Auto-Reply Settings - Superadmin Only */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Auto-Reply Settings
              </CardTitle>
              <CardDescription>
                Configure automatic welcome and away messages for each platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timezone Selection */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Business Timezone
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Used to calculate away hours
                  </p>
                </div>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Away Hours Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Away Hours Schedule
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Define when your business is away (auto-reply will be sent during these hours)
                  </p>
                </div>
                <Switch
                  checked={awayHoursEnabled}
                  onCheckedChange={setAwayHoursEnabled}
                />
              </div>

              {/* Away Hours Grid */}
              {awayHoursEnabled && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Click or drag to select hours when your business is <strong>away</strong>. Away messages will be sent during selected (orange) hours.
                  </p>
                  <AwayHoursGrid
                    schedule={awayHoursSchedule}
                    onChange={setAwayHoursSchedule}
                    disabled={!awayHoursEnabled}
                  />
                </div>
              )}

              <Separator />

              {/* Per-Platform Settings */}
              <div>
                <Label className="mb-3 block">Platform-Specific Messages</Label>
                <Tabs defaultValue="facebook" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="facebook" className="flex items-center gap-2">
                      <span className="text-blue-600">&#9679;</span>
                      Facebook
                    </TabsTrigger>
                    <TabsTrigger value="instagram" className="flex items-center gap-2">
                      <span className="text-pink-600">&#9679;</span>
                      Instagram
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                      <span className="text-green-600">&#9679;</span>
                      WhatsApp
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="facebook" className="mt-4">
                    <PlatformAutoReplyForm
                      platform="facebook"
                      settings={autoReplySettings.facebook || defaultPlatformSettings}
                      onChange={(s) => updatePlatformSettings('facebook', s)}
                    />
                  </TabsContent>
                  <TabsContent value="instagram" className="mt-4">
                    <PlatformAutoReplyForm
                      platform="instagram"
                      settings={autoReplySettings.instagram || defaultPlatformSettings}
                      onChange={(s) => updatePlatformSettings('instagram', s)}
                    />
                  </TabsContent>
                  <TabsContent value="whatsapp" className="mt-4">
                    <PlatformAutoReplyForm
                      platform="whatsapp"
                      settings={autoReplySettings.whatsapp || defaultPlatformSettings}
                      onChange={(s) => updatePlatformSettings('whatsapp', s)}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Notification Sounds Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              {t("settingsPage.notificationSounds.title") || "Notification Sounds"}
            </CardTitle>
            <CardDescription>
              {t("settingsPage.notificationSounds.description") || "Customize notification sounds for each platform"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Facebook Sound */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <span className="text-blue-600">&#9679;</span>
                {t("settingsPage.notificationSounds.facebook") || "Facebook"}
              </Label>
              <div className="flex gap-2">
                <Select value={soundFacebook} onValueChange={setSoundFacebook}>
                  <SelectTrigger className="w-[200px]">
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
                <Button variant="ghost" size="icon" onClick={() => previewSound(soundFacebook)}>
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Instagram Sound */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <span className="text-pink-600">&#9679;</span>
                {t("settingsPage.notificationSounds.instagram") || "Instagram"}
              </Label>
              <div className="flex gap-2">
                <Select value={soundInstagram} onValueChange={setSoundInstagram}>
                  <SelectTrigger className="w-[200px]">
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
                <Button variant="ghost" size="icon" onClick={() => previewSound(soundInstagram)}>
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* WhatsApp Sound */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <span className="text-green-600">&#9679;</span>
                {t("settingsPage.notificationSounds.whatsapp") || "WhatsApp"}
              </Label>
              <div className="flex gap-2">
                <Select value={soundWhatsapp} onValueChange={setSoundWhatsapp}>
                  <SelectTrigger className="w-[200px]">
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
                <Button variant="ghost" size="icon" onClick={() => previewSound(soundWhatsapp)}>
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Email Sound */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <span className="text-red-600">&#9679;</span>
                {t("settingsPage.notificationSounds.email") || "Email"}
              </Label>
              <div className="flex gap-2">
                <Select value={soundEmail} onValueChange={setSoundEmail}>
                  <SelectTrigger className="w-[200px]">
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
                <Button variant="ghost" size="icon" onClick={() => previewSound(soundEmail)}>
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Team Chat Sound */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <span className="text-purple-600">&#9679;</span>
                {t("settingsPage.notificationSounds.teamChat") || "Team Chat"}
              </Label>
              <div className="flex gap-2">
                <Select value={soundTeamChat} onValueChange={setSoundTeamChat}>
                  <SelectTrigger className="w-[200px]">
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
                <Button variant="ghost" size="icon" onClick={() => previewSound(soundTeamChat)}>
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* System Sound */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <span className="text-gray-600">&#9679;</span>
                {t("settingsPage.notificationSounds.system") || "System"}
              </Label>
              <div className="flex gap-2">
                <Select value={soundSystem} onValueChange={setSoundSystem}>
                  <SelectTrigger className="w-[200px]">
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
                <Button variant="ghost" size="icon" onClick={() => previewSound(soundSystem)}>
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
