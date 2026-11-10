"use client";

import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Loader2, Users, Play, MessageSquare, Wrench, Trash2, Mail, Sparkles, Settings2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialSettings, useUpdateSocialSettings, useClearPlatformHistory, useEmailStatus, AutoReplySettings, AwayHoursSchedule, PlatformAutoReplySettings, SocialSettings } from "@/hooks/api/useSocial";
import { EmailSyncDebug } from "@/components/social/EmailSyncDebug";
import { AICompanionTab } from "./AICompanionTab";
import { NOTIFICATION_SOUNDS, getNotificationSound } from "@/utils/notificationSound";
import { Segmented } from "@/components/redesign/segmented";
import { rdButton } from "@/components/redesign/buttons";
import {
  ActionButton,
  FieldRow,
  SettingsFormPage,
  SettingsNote,
  SettingsSection,
  SettingsToggle,
  StickySaveBar,
  settingsFieldWidth,
  settingsInputClass,
} from "@/components/redesign/settings";
import { cn } from "@/lib/utils";
import { ChannelDot, SectionBlock, StackLabel, selectTriggerClass, textareaClass } from "@/components/social/settings-blocks";

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

const DEFAULT_RATING_MESSAGE_KA = "გმადლობთ ჩვენთან საუბრისთვის! გთხოვთ შეაფასოთ თქვენი გამოცდილება: {link}";
const DEFAULT_RATING_MESSAGE_EN = "Thank you for chatting with us! Please rate your experience: {link}";

/**
 * Everything the page's Save sends, in one object. `fromSettings` is the
 * mapping the page always used to load the server values; the save bar
 * compares the current form with the last loaded one.
 */
interface SocialSettingsForm {
  chatAssignmentEnabled: boolean;
  hideAssignedChats: boolean;
  collectCustomerRating: boolean;
  staleReminderEnabled: boolean;
  staleReminderMinutes: number;
  linkBasedRatingEnabled: boolean;
  ratingRequestMessageKa: string;
  ratingRequestMessageEn: string;
  postReviewRedirectUrl: string;
  soundFacebook: string;
  soundInstagram: string;
  soundWhatsapp: string;
  soundEmail: string;
  soundWidget: string;
  soundTeamChat: string;
  soundSystem: string;
  timezone: string;
  awayHoursEnabled: boolean;
  awayHoursSchedule: AwayHoursSchedule;
  autoReplySettings: AutoReplySettings;
}

const INITIAL_FORM: SocialSettingsForm = {
  chatAssignmentEnabled: false,
  hideAssignedChats: false,
  collectCustomerRating: false,
  staleReminderEnabled: false,
  staleReminderMinutes: 60,
  linkBasedRatingEnabled: false,
  ratingRequestMessageKa: DEFAULT_RATING_MESSAGE_KA,
  ratingRequestMessageEn: DEFAULT_RATING_MESSAGE_EN,
  postReviewRedirectUrl: "",
  soundFacebook: 'mixkit-bubble-pop-up-alert-notification-2357.wav',
  soundInstagram: 'mixkit-magic-notification-ring-2344.wav',
  soundWhatsapp: 'mixkit-positive-notification-951.wav',
  soundEmail: 'mixkit-bell-notification-933.wav',
  soundWidget: 'mixkit-bubble-pop-up-alert-notification-2357.wav',
  soundTeamChat: 'mixkit-happy-bells-notification-937.wav',
  soundSystem: 'mixkit-confirmation-tone-2867.wav',
  timezone: 'UTC',
  awayHoursEnabled: false,
  awayHoursSchedule: {},
  autoReplySettings: {
    facebook: { ...defaultPlatformSettings },
    instagram: { ...defaultPlatformSettings },
    whatsapp: { ...defaultPlatformSettings },
  },
};

/**
 * A stored sound that is not in the picker list (the backend default for the
 * widget is the placeholder "default") showed an empty select and played no
 * file; such a value falls back to the page's default for that channel.
 */
function knownSound(value: string | undefined | null, fallback: string): string {
  return value && NOTIFICATION_SOUNDS.some((s) => s.value === value) ? value : fallback;
}

function fromSettings(settings: SocialSettings): SocialSettingsForm {
  return {
    chatAssignmentEnabled: settings.chat_assignment_enabled ?? false,
    hideAssignedChats: settings.hide_assigned_chats ?? false,
    collectCustomerRating: settings.collect_customer_rating ?? false,
    // Stale assignment reminders
    staleReminderEnabled: settings.stale_assignment_reminder_enabled ?? false,
    staleReminderMinutes: settings.stale_assignment_reminder_minutes ?? 60,
    // Link-based rating settings
    linkBasedRatingEnabled: settings.link_based_rating_enabled ?? false,
    ratingRequestMessageKa: settings.rating_request_message_template_ka || DEFAULT_RATING_MESSAGE_KA,
    ratingRequestMessageEn: settings.rating_request_message_template_en || DEFAULT_RATING_MESSAGE_EN,
    postReviewRedirectUrl: settings.post_review_redirect_url || '',
    // Notification sounds
    soundFacebook: knownSound(settings.notification_sound_facebook, 'mixkit-bubble-pop-up-alert-notification-2357.wav'),
    soundInstagram: knownSound(settings.notification_sound_instagram, 'mixkit-magic-notification-ring-2344.wav'),
    soundWhatsapp: knownSound(settings.notification_sound_whatsapp, 'mixkit-positive-notification-951.wav'),
    soundEmail: knownSound(settings.notification_sound_email, 'mixkit-bell-notification-933.wav'),
    soundWidget: knownSound(settings.notification_sound_widget, 'mixkit-bubble-pop-up-alert-notification-2357.wav'),
    soundTeamChat: knownSound(settings.notification_sound_team_chat, 'mixkit-happy-bells-notification-937.wav'),
    soundSystem: knownSound(settings.notification_sound_system, 'mixkit-confirmation-tone-2867.wav'),
    // Auto-reply settings
    timezone: settings.timezone || 'UTC',
    awayHoursEnabled: settings.away_hours_enabled ?? false,
    awayHoursSchedule: settings.away_hours_schedule || {},
    autoReplySettings: {
      facebook: { ...defaultPlatformSettings, ...settings.auto_reply_settings?.facebook },
      instagram: { ...defaultPlatformSettings, ...settings.auto_reply_settings?.instagram },
      whatsapp: { ...defaultPlatformSettings, ...settings.auto_reply_settings?.whatsapp },
    },
  };
}

interface AwayHoursGridProps {
  schedule: AwayHoursSchedule;
  onChange: (schedule: AwayHoursSchedule) => void;
  disabled?: boolean;
}

function AwayHoursGrid({ schedule, onChange, disabled }: AwayHoursGridProps) {
  const t = useTranslations("social");
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
    <div className="overflow-x-auto" data-testid="away-hours-grid">
      <div className="min-w-[640px]">
        {/* Hour headers */}
        <div className="mb-1 flex">
          <div className="w-14 shrink-0" />
          <div className="flex flex-1 gap-px">
            {HOURS.map(hour => (
              <div key={hour} className="flex-1 text-center font-mono text-[10px] text-muted-foreground tabular-nums">
                {hour.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>

        {/* Day rows */}
        {DAYS.map(day => (
          <div key={day} className="mb-px flex">
            <div className="w-14 shrink-0 py-0.5 text-xs font-medium capitalize">
              {t(`settingsPage.autoReply.days.${day}`)}
            </div>
            <div className="flex flex-1 gap-px">
              {HOURS.map(hour => (
                <div
                  key={`${day}-${hour}`}
                  className={cn(
                    "h-5 flex-1 cursor-pointer select-none rounded-[3px] transition-colors",
                    isSelected(day, hour) ? "bg-orange-500 hover:bg-orange-600" : "bg-muted hover:bg-muted-foreground/20",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                  onMouseDown={() => handleMouseDown(day, hour)}
                  onMouseEnter={() => handleMouseEnter(day, hour)}
                  title={`${day.charAt(0).toUpperCase() + day.slice(1)} ${hour}:00 - ${hour + 1}:00`}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-[3px] bg-muted" />
            <span>{t("settingsPage.autoReply.available")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-[3px] bg-orange-500" />
            <span>{t("settingsPage.autoReply.awayActive")}</span>
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
  const t = useTranslations("social");
  const platformLabels = {
    facebook: 'Facebook Messenger',
    instagram: 'Instagram DMs',
    whatsapp: 'WhatsApp',
  };

  return (
    <>
      {/* Welcome Message */}
      <FieldRow
        label={t("settingsPage.autoReply.welcomeMessage")}
        help={t("settingsPage.autoReply.welcomeMessageDescription")}
        htmlFor={`welcome-${platform}`}
        align="center"
      >
        <SettingsToggle
          id={`welcome-${platform}`}
          checked={settings.welcome_enabled}
          onCheckedChange={(checked) => onChange({ ...settings, welcome_enabled: checked })}
        />
      </FieldRow>
      {settings.welcome_enabled && (
        <SectionBlock>
          <Textarea
            aria-label={t("settingsPage.autoReply.welcomeMessage")}
            className={textareaClass}
            placeholder={t("settingsPage.autoReply.welcomePlaceholder", { platform: platformLabels[platform] })}
            value={settings.welcome_message}
            onChange={(e) => onChange({ ...settings, welcome_message: e.target.value })}
            rows={3}
          />
        </SectionBlock>
      )}

      {/* Away Message */}
      <FieldRow
        label={t("settingsPage.autoReply.awayMessage")}
        help={t("settingsPage.autoReply.awayMessageDescription")}
        htmlFor={`away-${platform}`}
        align="center"
      >
        <SettingsToggle
          id={`away-${platform}`}
          checked={settings.away_enabled}
          onCheckedChange={(checked) => onChange({ ...settings, away_enabled: checked })}
        />
      </FieldRow>
      {settings.away_enabled && (
        <SectionBlock>
          <Textarea
            aria-label={t("settingsPage.autoReply.awayMessage")}
            className={textareaClass}
            placeholder={t("settingsPage.autoReply.awayPlaceholder")}
            value={settings.away_message}
            onChange={(e) => onChange({ ...settings, away_message: e.target.value })}
            rows={3}
          />
        </SectionBlock>
      )}

      {/* Variable hint */}
      <SectionBlock>
        <SettingsNote tone="neutral">
          <strong className="font-semibold">{t("settingsPage.autoReply.availableVariables")}</strong>{" "}
          {t.rich("settingsPage.autoReply.variableHint", {
            code: (chunks) => <code className="rounded bg-muted px-1 font-mono">{chunks}</code>
          })}
        </SettingsNote>
      </SectionBlock>
    </>
  );
}

// Tab Components
function NotificationsTab({
  notifications,
  setNotifications,
  notificationSound,
  setNotificationSound,
  soundFacebook,
  setSoundFacebook,
  soundInstagram,
  setSoundInstagram,
  soundWhatsapp,
  setSoundWhatsapp,
  soundEmail,
  setSoundEmail,
  soundWidget,
  setSoundWidget,
  soundTeamChat,
  setSoundTeamChat,
  soundSystem,
  setSoundSystem,
  previewSound,
  t,
}: {
  notifications: boolean;
  setNotifications: (v: boolean) => void;
  notificationSound: boolean;
  setNotificationSound: (v: boolean) => void;
  soundFacebook: string;
  setSoundFacebook: (v: string) => void;
  soundInstagram: string;
  setSoundInstagram: (v: string) => void;
  soundWhatsapp: string;
  setSoundWhatsapp: (v: string) => void;
  soundEmail: string;
  setSoundEmail: (v: string) => void;
  soundWidget: string;
  setSoundWidget: (v: string) => void;
  soundTeamChat: string;
  setSoundTeamChat: (v: string) => void;
  soundSystem: string;
  setSoundSystem: (v: string) => void;
  previewSound: (sound: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const soundRows = [
    { key: "facebook", label: t("settingsPage.notificationSounds.facebook") || "Facebook", dot: "bg-blue-600", value: soundFacebook, set: setSoundFacebook },
    { key: "instagram", label: t("settingsPage.notificationSounds.instagram") || "Instagram", dot: "bg-pink-600", value: soundInstagram, set: setSoundInstagram },
    { key: "whatsapp", label: t("settingsPage.notificationSounds.whatsapp") || "WhatsApp", dot: "bg-green-600", value: soundWhatsapp, set: setSoundWhatsapp },
    { key: "email", label: t("settingsPage.notificationSounds.email") || "Email", dot: "bg-red-600", value: soundEmail, set: setSoundEmail },
    { key: "widget", label: t("settingsPage.notificationSounds.widget") || "Website widget", dot: "bg-indigo-600", value: soundWidget, set: setSoundWidget },
    { key: "team-chat", label: t("settingsPage.notificationSounds.teamChat") || "Team Chat", dot: "bg-purple-600", value: soundTeamChat, set: setSoundTeamChat },
    { key: "system", label: t("settingsPage.notificationSounds.system") || "System", dot: "bg-gray-600", value: soundSystem, set: setSoundSystem },
  ];

  return (
    <>
      {/* Notification Settings */}
      <SettingsSection
        title={t("settingsPage.notifications.title") || "Notifications"}
        hint={t("settingsPage.notifications.description") || "Manage notification preferences for new messages"}
        testId="social-notifications-section"
      >
        <FieldRow
          label={t("settingsPage.notifications.enable") || "Enable notifications"}
          help={t("settingsPage.notifications.enableDescription") || "Show notifications for new messages"}
          htmlFor="notifications"
          align="center"
        >
          <SettingsToggle id="notifications" checked={notifications} onCheckedChange={setNotifications} />
        </FieldRow>
        {notifications && (
          <FieldRow
            label={t("settingsPage.notifications.sound") || "Notification sound"}
            help={t("settingsPage.notifications.soundDescription") || "Play sound when new message arrives"}
            htmlFor="notification-sound"
            align="center"
          >
            <SettingsToggle id="notification-sound" checked={notificationSound} onCheckedChange={setNotificationSound} />
          </FieldRow>
        )}
      </SettingsSection>

      {/* Notification Sounds Settings */}
      <SettingsSection
        title={t("settingsPage.notificationSounds.title") || "Notification Sounds"}
        hint={t("settingsPage.notificationSounds.description") || "Customize notification sounds for each platform"}
        testId="social-sounds-section"
      >
        {soundRows.map((row) => (
          <FieldRow
            key={row.key}
            label={
              <span className="inline-flex items-center gap-2">
                <ChannelDot className={row.dot} />
                {row.label}
              </span>
            }
            align="center"
            testId={`sound-row-${row.key}`}
          >
            <div className={cn("flex items-center gap-1.5", settingsFieldWidth)}>
              <Select value={row.value} onValueChange={row.set}>
                <SelectTrigger className={cn(selectTriggerClass, "min-w-0 flex-1")} aria-label={row.label}>
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
              <button
                type="button"
                onClick={() => previewSound(row.value)}
                className={rdButton.ghostIcon}
                aria-label={t("settingsPage.notificationSounds.play", { channel: row.label })}
                title={t("settingsPage.notificationSounds.play", { channel: row.label })}
              >
                <Play className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </FieldRow>
        ))}
      </SettingsSection>
    </>
  );
}

function AutoReplyTab({
  timezone,
  setTimezone,
  awayHoursEnabled,
  setAwayHoursEnabled,
  awayHoursSchedule,
  setAwayHoursSchedule,
  autoReplySettings,
  updatePlatformSettings,
}: {
  timezone: string;
  setTimezone: (v: string) => void;
  awayHoursEnabled: boolean;
  setAwayHoursEnabled: (v: boolean) => void;
  awayHoursSchedule: AwayHoursSchedule;
  setAwayHoursSchedule: (v: AwayHoursSchedule) => void;
  autoReplySettings: AutoReplySettings;
  updatePlatformSettings: (platform: 'facebook' | 'instagram' | 'whatsapp', settings: PlatformAutoReplySettings) => void;
}) {
  const t = useTranslations("social");
  const [platform, setPlatform] = useState<'facebook' | 'instagram' | 'whatsapp'>("facebook");
  return (
    <>
      <SettingsSection
        title={t("settingsPage.autoReply.title")}
        hint={t("settingsPage.autoReply.description")}
        testId="social-auto-reply-section"
      >
        {/* Timezone Selection */}
        <FieldRow
          label={t("settingsPage.autoReply.businessTimezone")}
          help={t("settingsPage.autoReply.businessTimezoneDescription")}
          align="center"
        >
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className={cn(selectTriggerClass, settingsFieldWidth)} aria-label={t("settingsPage.autoReply.businessTimezone")}>
              <SelectValue placeholder={t("settingsPage.autoReply.selectTimezone")} />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {/* Away Hours Toggle */}
        <FieldRow
          label={t("settingsPage.autoReply.awayHoursSchedule")}
          help={t("settingsPage.autoReply.awayHoursDescription")}
          htmlFor="away-hours-enabled"
          align="center"
        >
          <SettingsToggle id="away-hours-enabled" checked={awayHoursEnabled} onCheckedChange={setAwayHoursEnabled} />
        </FieldRow>

        {/* Away Hours Grid */}
        {awayHoursEnabled && (
          <SectionBlock className="gap-3">
            <p className="text-xs leading-[17px] text-muted-foreground">
              {t.rich("settingsPage.autoReply.awayHoursInstruction", {
                strong: (chunks) => <strong>{chunks}</strong>
              })}
            </p>
            <AwayHoursGrid
              schedule={awayHoursSchedule}
              onChange={setAwayHoursSchedule}
              disabled={!awayHoursEnabled}
            />
          </SectionBlock>
        )}
      </SettingsSection>

      {/* Per-Platform Settings */}
      <SettingsSection
        title={t("settingsPage.autoReply.platformMessages")}
        actions={
          <Segmented
            value={platform}
            onChange={setPlatform}
            ariaLabel={t("settingsPage.autoReply.platformMessages")}
            testId="auto-reply-platforms"
            options={[
              { value: "facebook", label: "Facebook" },
              { value: "instagram", label: "Instagram" },
              { value: "whatsapp", label: "WhatsApp" },
            ]}
          />
        }
        testId="social-platform-messages-section"
      >
        <PlatformAutoReplyForm
          key={platform}
          platform={platform}
          settings={autoReplySettings[platform] || defaultPlatformSettings}
          onChange={(s) => updatePlatformSettings(platform, s)}
        />
      </SettingsSection>
    </>
  );
}

function ChatManagementTab({
  chatAssignmentEnabled,
  setChatAssignmentEnabled,
  hideAssignedChats,
  setHideAssignedChats,
  collectCustomerRating,
  setCollectCustomerRating,
  staleReminderEnabled,
  setStaleReminderEnabled,
  staleReminderMinutes,
  setStaleReminderMinutes,
  linkBasedRatingEnabled,
  setLinkBasedRatingEnabled,
  ratingRequestMessageKa,
  setRatingRequestMessageKa,
  ratingRequestMessageEn,
  setRatingRequestMessageEn,
  postReviewRedirectUrl,
  setPostReviewRedirectUrl,
  autoAssign,
  setAutoAssign,
  t,
}: {
  chatAssignmentEnabled: boolean;
  setChatAssignmentEnabled: (v: boolean) => void;
  hideAssignedChats: boolean;
  setHideAssignedChats: (v: boolean) => void;
  collectCustomerRating: boolean;
  setCollectCustomerRating: (v: boolean) => void;
  staleReminderEnabled: boolean;
  setStaleReminderEnabled: (v: boolean) => void;
  staleReminderMinutes: number;
  setStaleReminderMinutes: (v: number) => void;
  linkBasedRatingEnabled: boolean;
  setLinkBasedRatingEnabled: (v: boolean) => void;
  ratingRequestMessageKa: string;
  setRatingRequestMessageKa: (v: string) => void;
  ratingRequestMessageEn: string;
  setRatingRequestMessageEn: (v: string) => void;
  postReviewRedirectUrl: string;
  setPostReviewRedirectUrl: (v: string) => void;
  autoAssign: boolean;
  setAutoAssign: (v: boolean) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <>
      <SettingsSection
        title={t("settingsPage.chatManagement.title") || "Chat Management"}
        hint={t("settingsPage.chatManagement.description") || "Configure chat assignment, sessions, and customer ratings"}
        testId="social-chat-management-section"
      >
        {/* Chat Assignment Toggle */}
        <FieldRow
          label={t("settingsPage.chatManagement.enableAssignment") || "Enable chat assignment"}
          help={t("settingsPage.chatManagement.enableAssignmentDescription") || "Allow users to claim chats and manage sessions. Only the assigned user will receive notifications for that chat."}
          htmlFor="chat-assignment"
          align="center"
        >
          <SettingsToggle id="chat-assignment" checked={chatAssignmentEnabled} onCheckedChange={setChatAssignmentEnabled} />
        </FieldRow>

        {/* Hide Assigned Chats Toggle */}
        <FieldRow
          label={t("settingsPage.chatManagement.hideAssigned") || "Hide assigned chats from others"}
          help={t("settingsPage.chatManagement.hideAssignedDescription") || "When enabled, assigned chats are hidden from other users (admins can still see all)"}
          htmlFor="hide-assigned"
          align="center"
        >
          <SettingsToggle id="hide-assigned" checked={hideAssignedChats} onCheckedChange={setHideAssignedChats} />
        </FieldRow>

        {/* Stale Assignment Reminder Toggle */}
        <FieldRow
          label={t("settingsPage.chatManagement.staleReminder") || "Remind agents about inactive assigned chats"}
          help={t("settingsPage.chatManagement.staleReminderDescription") || "Agents see a popup when a chat assigned to them has had no activity for the set time."}
          htmlFor="stale-reminder"
          align="center"
        >
          <SettingsToggle id="stale-reminder" checked={staleReminderEnabled} onCheckedChange={setStaleReminderEnabled} />
        </FieldRow>

        {/* Threshold (shown when reminders are enabled) */}
        {staleReminderEnabled && (
          <FieldRow
            label={t("settingsPage.chatManagement.staleReminderMinutes") || "Inactivity threshold (minutes)"}
            help={t("settingsPage.chatManagement.staleReminderMinutesDescription") || "How long a chat can be quiet before the reminder appears (5–10080)."}
            htmlFor="stale-reminder-minutes"
            align="center"
            className="sm:ps-8"
          >
            <input
              id="stale-reminder-minutes"
              type="number"
              min={5}
              max={10080}
              className={cn(settingsInputClass, "w-32 font-mono tabular-nums")}
              value={staleReminderMinutes}
              onChange={(e) => setStaleReminderMinutes(Number(e.target.value))}
            />
          </FieldRow>
        )}

        {/* Collect Customer Rating Toggle */}
        <FieldRow
          label={t("settingsPage.chatManagement.collectRating") || "Collect customer rating"}
          help={t("settingsPage.chatManagement.collectRatingDescription") || "Send rating request (1-5) to customer when session ends"}
          htmlFor="collect-rating"
          align="center"
        >
          <SettingsToggle id="collect-rating" checked={collectCustomerRating} onCheckedChange={setCollectCustomerRating} />
        </FieldRow>

        {/* Link-based Rating Settings (shown when collect rating is enabled) */}
        {collectCustomerRating && (
          <>
            <FieldRow
              label={t("settingsPage.chatManagement.linkBasedRating") || "Use link-based rating"}
              help={t("settingsPage.chatManagement.linkBasedRatingDescription") || "Send a link to a review page instead of in-chat quick replies"}
              htmlFor="link-based-rating"
              align="center"
              className="sm:ps-8"
            >
              <SettingsToggle id="link-based-rating" checked={linkBasedRatingEnabled} onCheckedChange={setLinkBasedRatingEnabled} />
            </FieldRow>

            {/* Message Templates (shown when link-based rating is enabled) */}
            {linkBasedRatingEnabled && (
              <>
                <SectionBlock className="sm:ps-8">
                  <StackLabel htmlFor="rating-message-ka" label={t("settingsPage.chatManagement.ratingMessageKa") || "Rating request message (Georgian)"} />
                  <Textarea
                    id="rating-message-ka"
                    className={textareaClass}
                    placeholder="გმადლობთ ჩვენთან საუბრისთვის! გთხოვთ შეაფასოთ თქვენი გამოცდილება: {link}"
                    value={ratingRequestMessageKa}
                    onChange={(e) => setRatingRequestMessageKa(e.target.value)}
                    rows={2}
                  />
                </SectionBlock>
                <SectionBlock className="sm:ps-8">
                  <StackLabel htmlFor="rating-message-en" label={t("settingsPage.chatManagement.ratingMessageEn") || "Rating request message (English)"} />
                  <Textarea
                    id="rating-message-en"
                    className={textareaClass}
                    placeholder="Thank you for chatting with us! Please rate your experience: {link}"
                    value={ratingRequestMessageEn}
                    onChange={(e) => setRatingRequestMessageEn(e.target.value)}
                    rows={2}
                  />
                  <SettingsNote tone="neutral">
                    <strong className="font-semibold">{t("settingsPage.chatManagement.templateHint") || "Hint"}:</strong>{" "}
                    {t("settingsPage.chatManagement.templateHintDescription") || "Use {link} placeholder where you want the rating link to appear."}
                  </SettingsNote>
                </SectionBlock>
                <FieldRow
                  label={t("settingsPage.chatManagement.postReviewRedirectUrl") || "Post-review redirect URL"}
                  help={t("settingsPage.chatManagement.postReviewRedirectUrlDescription") || "After submitting a review, the customer will be redirected to this URL (e.g. your website)"}
                  htmlFor="post-review-redirect-url"
                  className="sm:ps-8"
                >
                  <input
                    id="post-review-redirect-url"
                    type="url"
                    placeholder="https://example.com"
                    className={cn(settingsInputClass, settingsFieldWidth)}
                    value={postReviewRedirectUrl}
                    onChange={(e) => setPostReviewRedirectUrl(e.target.value)}
                  />
                </FieldRow>
              </>
            )}
          </>
        )}

        {/* Info box showing enabled features */}
        {(chatAssignmentEnabled || hideAssignedChats || collectCustomerRating) && (
          <SectionBlock>
            <SettingsNote tone="info" testId="enabled-features">
              <p className="font-semibold">{t("settingsPage.enabledFeatures.title") || "Enabled features:"}</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
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
                  <li>
                    {linkBasedRatingEnabled
                      ? (t("settingsPage.enabledFeatures.linkBasedRating") || "When session ends, customer receives a link to review page with emoji rating")
                      : (t("settingsPage.enabledFeatures.ratingRequest") || "When session ends, customer receives rating request (1-5)")}
                  </li>
                )}
              </ul>
            </SettingsNote>
          </SectionBlock>
        )}
      </SettingsSection>

      {/* Auto Assignment Settings */}
      <SettingsSection
        title={t("settingsPage.autoAssignment.title") || "Automatic Assignment"}
        hint={t("settingsPage.autoAssignment.description") || "Configure automatic assignment of conversations to agents"}
        testId="social-auto-assignment-section"
      >
        <FieldRow
          label={t("settingsPage.autoAssignment.enable") || "Auto-assign conversations"}
          help={t("settingsPage.autoAssignment.enableDescription") || "Automatically assign new conversations to available agents"}
          htmlFor="auto-assign"
          align="center"
        >
          <SettingsToggle id="auto-assign" checked={autoAssign} onCheckedChange={setAutoAssign} />
        </FieldRow>

        {autoAssign && (
          <SectionBlock>
            <StackLabel
              label={t("settingsPage.autoAssignment.method") || "Assignment method"}
              help={t("settingsPage.autoAssignment.methodDescription") || "Coming soon: Round-robin, load-based, and manual assignment"}
            />
          </SectionBlock>
        )}
      </SettingsSection>
    </>
  );
}

function ClearHistoryCard() {
  const t = useTranslations("social");
  const { toast } = useToast();
  const clearHistory = useClearPlatformHistory();
  const [confirmPlatform, setConfirmPlatform] = useState<'facebook' | 'instagram' | 'whatsapp' | null>(null);

  const handleClear = (platform: 'facebook' | 'instagram' | 'whatsapp') => {
    clearHistory.mutate(platform, {
      onSuccess: (data) => {
        toast({
          title: t("settingsPage.clearHistory.historyCleared"),
          description: t("settingsPage.clearHistory.deletedMessages", { count: data.messages_deleted, platform }),
        });
        setConfirmPlatform(null);
      },
      onError: (error: any) => {
        toast({
          title: t("settingsPage.clearHistory.error"),
          description: error?.response?.data?.error || t("settingsPage.clearHistory.failedToClear"),
          variant: "destructive",
        });
        setConfirmPlatform(null);
      },
    });
  };

  const platforms = [
    { key: 'facebook' as const, label: 'Facebook' },
    { key: 'instagram' as const, label: 'Instagram' },
    { key: 'whatsapp' as const, label: 'WhatsApp' },
  ];

  return (
    <SettingsSection
      title={t("settingsPage.clearHistory.title")}
      hint={t("settingsPage.clearHistory.description")}
      className="border-destructive/40"
      testId="social-clear-history-section"
    >
      {platforms.map(({ key, label }) => (
        <FieldRow key={key} label={t("settingsPage.clearHistory.platformMessages", { platform: label })} align="center" testId={`clear-history-${key}`}>
          {confirmPlatform === key ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-destructive">{t("settingsPage.clearHistory.areYouSure")}</span>
              <button
                type="button"
                className={cn(rdButton.primarySm, "bg-destructive text-destructive-foreground")}
                disabled={clearHistory.isPending}
                onClick={() => handleClear(key)}
              >
                {clearHistory.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : t("settingsPage.clearHistory.yesDeleteAll")}
              </button>
              <button
                type="button"
                className={rdButton.outlineSm}
                disabled={clearHistory.isPending}
                onClick={() => setConfirmPlatform(null)}
              >
                {t("settingsPage.clearHistory.cancel")}
              </button>
            </div>
          ) : (
            <ActionButton tone="danger" icon={Trash2} onClick={() => setConfirmPlatform(key)}>
              {t("settingsPage.clearHistory.clear")}
            </ActionButton>
          )}
        </FieldRow>
      ))}
    </SettingsSection>
  );
}

function EmailTab() {
  const t = useTranslations("social");
  const { data: emailStatus } = useEmailStatus();
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | undefined>(undefined);

  const connections = emailStatus?.connections || [];

  // Auto-select first connection
  useEffect(() => {
    if (connections.length > 0 && selectedConnectionId === undefined) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [connections, selectedConnectionId]);

  return (
    <>
      {connections.length > 1 && (
        <SettingsSection title={t("settingsPage.tabs.email")} testId="social-email-connection-picker">
          <FieldRow label={t("settingsPage.email.selectConnection")} align="center">
            <Select
              value={selectedConnectionId?.toString() || ''}
              onValueChange={(v) => setSelectedConnectionId(Number(v))}
            >
              <SelectTrigger className={cn(selectTriggerClass, settingsFieldWidth)} aria-label={t("settingsPage.email.selectConnection")}>
                <SelectValue placeholder={t("settingsPage.email.selectEmail")} />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id.toString()}>
                    {conn.email_address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </SettingsSection>
      )}

      {connections.length === 0 ? (
        <div className="rounded-[10px] border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
          {t("settingsPage.email.noConnections")}
        </div>
      ) : (
        <EmailSyncDebug connectionId={selectedConnectionId} />
      )}
    </>
  );
}

function AdvancedTab() {
  return <ClearHistoryCard />;
}

type SocialTab = "notifications" | "auto-reply" | "chat-management" | "email" | "advanced" | "ai-companion";

export default function SocialSettingsPage() {
  const t = useTranslations("social");
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user is superadmin (staff)
  const isSuperAdmin = user?.is_staff === true;

  // Use React Query hooks for settings
  const { data: settings, isLoading: loading } = useSocialSettings();
  const updateSettings = useUpdateSocialSettings();

  // Local-only toggles (never part of the saved payload; unchanged behaviour).
  const [notifications, setNotifications] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [autoAssign, setAutoAssign] = useState(false);

  // Saved settings: the form and the last values loaded from the server.
  const [form, setForm] = useState<SocialSettingsForm>(INITIAL_FORM);
  const [loaded, setLoaded] = useState<SocialSettingsForm>(INITIAL_FORM);
  const setField = <K extends keyof SocialSettingsForm>(key: K) => (value: SocialSettingsForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const [tab, setTab] = useState<SocialTab>("notifications");

  // Sync local state with query data when it loads
  useEffect(() => {
    if (settings) {
      const next = fromSettings(settings);
      setForm(next);
      setLoaded(next);
      // Update the sound manager with backend settings
      getNotificationSound().updateSettings(settings);
    }
  }, [settings]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(loaded), [form, loaded]);

  const previewSound = (soundFile: string) => {
    getNotificationSound().preview(soundFile);
  };

  const updatePlatformSettings = (platform: 'facebook' | 'instagram' | 'whatsapp', newSettings: PlatformAutoReplySettings) => {
    setForm(prev => ({
      ...prev,
      autoReplySettings: {
        ...prev.autoReplySettings,
        [platform]: newSettings,
      },
    }));
  };

  const handleSaveSettings = () => {
    const payload = {
      chat_assignment_enabled: Boolean(form.chatAssignmentEnabled),
      // session_management_enabled is deprecated - session management is now part of chat assignment
      session_management_enabled: Boolean(form.chatAssignmentEnabled),
      hide_assigned_chats: Boolean(form.hideAssignedChats),
      collect_customer_rating: Boolean(form.collectCustomerRating),
      // Stale assignment reminders
      stale_assignment_reminder_enabled: Boolean(form.staleReminderEnabled),
      stale_assignment_reminder_minutes: Math.min(10080, Math.max(5, Number(form.staleReminderMinutes) || 60)),
      // Link-based rating settings
      link_based_rating_enabled: Boolean(form.linkBasedRatingEnabled),
      rating_request_message_template_ka: form.ratingRequestMessageKa,
      rating_request_message_template_en: form.ratingRequestMessageEn,
      post_review_redirect_url: form.postReviewRedirectUrl,
      // Notification sound settings
      notification_sound_facebook: form.soundFacebook,
      notification_sound_instagram: form.soundInstagram,
      notification_sound_whatsapp: form.soundWhatsapp,
      notification_sound_email: form.soundEmail,
      notification_sound_widget: form.soundWidget,
      notification_sound_team_chat: form.soundTeamChat,
      notification_sound_system: form.soundSystem,
      // Auto-reply settings
      timezone: form.timezone,
      away_hours_enabled: form.awayHoursEnabled,
      away_hours_schedule: form.awayHoursSchedule,
      auto_reply_settings: form.autoReplySettings,
    };

    updateSettings.mutate(payload, {
      onSuccess: () => {
        toast({
          title: t("settingsPage.settingsSaved"),
          description: t("settingsPage.settingsSavedDescription"),
        });
      },
      onError: (error: any) => {
        console.error("Failed to save settings:", error);
        toast({
          title: t("settingsPage.errorSaving"),
          description: error.response?.data?.error || t("settingsPage.errorSavingDescription"),
          variant: "destructive",
        });
      },
    });
  };

  const saving = updateSettings.isPending;

  // Build tabs based on user role
  const tabs = [
    { value: "notifications" as const, label: t("settingsPage.tabs.notifications"), icon: Bell },
    ...(isSuperAdmin ? [{ value: "auto-reply" as const, label: t("settingsPage.tabs.autoReply"), icon: MessageSquare }] : []),
    ...(isSuperAdmin ? [{ value: "chat-management" as const, label: t("settingsPage.tabs.chatManagement"), icon: Users }] : []),
    ...(isSuperAdmin ? [{ value: "email" as const, label: t("settingsPage.tabs.email"), icon: Mail }] : []),
    ...(isSuperAdmin ? [{ value: "advanced" as const, label: t("settingsPage.tabs.advanced"), icon: Wrench }] : []),
    ...(isSuperAdmin ? [{ value: "ai-companion" as const, label: t("settingsPage.tabs.aiCompanion"), icon: Sparkles }] : []),
  ];
  // A tab that is not offered (no longer staff) falls back to the first one.
  const activeTab: SocialTab = tabs.some((x) => x.value === tab) ? tab : "notifications";

  return (
    <SettingsFormPage
      icon={Settings2}
      title={t("settingsPage.title")}
      description={t("settingsPage.description")}
      testId="social-settings-page"
    >
      <Segmented
        value={activeTab}
        onChange={setTab}
        options={tabs}
        ariaLabel={t("settingsPage.title")}
        testId="social-settings-tabs"
        className="self-start"
      />

      {activeTab === "notifications" && (
        <NotificationsTab
          notifications={notifications}
          setNotifications={setNotifications}
          notificationSound={notificationSound}
          setNotificationSound={setNotificationSound}
          soundFacebook={form.soundFacebook}
          setSoundFacebook={setField("soundFacebook")}
          soundInstagram={form.soundInstagram}
          setSoundInstagram={setField("soundInstagram")}
          soundWhatsapp={form.soundWhatsapp}
          setSoundWhatsapp={setField("soundWhatsapp")}
          soundEmail={form.soundEmail}
          setSoundEmail={setField("soundEmail")}
          soundWidget={form.soundWidget}
          setSoundWidget={setField("soundWidget")}
          soundTeamChat={form.soundTeamChat}
          setSoundTeamChat={setField("soundTeamChat")}
          soundSystem={form.soundSystem}
          setSoundSystem={setField("soundSystem")}
          previewSound={previewSound}
          t={t}
        />
      )}

      {isSuperAdmin && activeTab === "auto-reply" && (
        <AutoReplyTab
          timezone={form.timezone}
          setTimezone={setField("timezone")}
          awayHoursEnabled={form.awayHoursEnabled}
          setAwayHoursEnabled={setField("awayHoursEnabled")}
          awayHoursSchedule={form.awayHoursSchedule}
          setAwayHoursSchedule={setField("awayHoursSchedule")}
          autoReplySettings={form.autoReplySettings}
          updatePlatformSettings={updatePlatformSettings}
        />
      )}

      {isSuperAdmin && activeTab === "chat-management" && (
        <ChatManagementTab
          chatAssignmentEnabled={form.chatAssignmentEnabled}
          setChatAssignmentEnabled={setField("chatAssignmentEnabled")}
          hideAssignedChats={form.hideAssignedChats}
          setHideAssignedChats={setField("hideAssignedChats")}
          collectCustomerRating={form.collectCustomerRating}
          setCollectCustomerRating={setField("collectCustomerRating")}
          staleReminderEnabled={form.staleReminderEnabled}
          setStaleReminderEnabled={setField("staleReminderEnabled")}
          staleReminderMinutes={form.staleReminderMinutes}
          setStaleReminderMinutes={setField("staleReminderMinutes")}
          linkBasedRatingEnabled={form.linkBasedRatingEnabled}
          setLinkBasedRatingEnabled={setField("linkBasedRatingEnabled")}
          ratingRequestMessageKa={form.ratingRequestMessageKa}
          setRatingRequestMessageKa={setField("ratingRequestMessageKa")}
          ratingRequestMessageEn={form.ratingRequestMessageEn}
          setRatingRequestMessageEn={setField("ratingRequestMessageEn")}
          postReviewRedirectUrl={form.postReviewRedirectUrl}
          setPostReviewRedirectUrl={setField("postReviewRedirectUrl")}
          autoAssign={autoAssign}
          setAutoAssign={setAutoAssign}
          t={t}
        />
      )}

      {isSuperAdmin && activeTab === "email" && <EmailTab />}

      {isSuperAdmin && activeTab === "advanced" && <AdvancedTab />}

      {isSuperAdmin && activeTab === "ai-companion" && <AICompanionTab />}

      {/* The page's Save (always reachable, as before) in the design save bar. */}
      <StickySaveBar
        mode="always"
        dirty={dirty}
        saving={saving}
        onSave={handleSaveSettings}
        onDiscard={() => setForm(loaded)}
        saveDisabled={saving || loading}
        labels={{
          unsaved: t("settingsPage.saveBar.unsaved"),
          discard: t("settingsPage.saveBar.discard"),
          save: t("settingsPage.saveSettings"),
          saving: t("settingsPage.saving"),
          saved: t("settingsPage.saveBar.saved"),
        }}
      />
    </SettingsFormPage>
  );
}
