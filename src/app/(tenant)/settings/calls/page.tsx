"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { SipConfigForm } from "@/components/calls/SipConfigForm";
import { SipConfigList } from "@/components/calls/SipConfigList";
import { UserPhoneAssignments } from "@/components/calls/UserPhoneAssignments";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Phone, Plus, Zap, Upload, Trash2, Loader2 } from "lucide-react";
import { Segmented } from "@/components/redesign/segmented";
import { rdButton } from "@/components/redesign/buttons";
import { LoadingBlock } from "@/components/redesign/states";
import { EmptyState } from "@/app/(tenant)/tickets/_components/primitives/empty-state";
import {
  ActionButton,
  ChoiceControl,
  FieldRow,
  SecretInput,
  SettingsNote,
  SettingsPage,
  SettingsSection,
  SettingsToggle,
  StickySaveBar,
  settingsFieldWidth,
  settingsInputClass,
} from "@/components/redesign/settings";
import { cn } from "@/lib/utils";
import {
  sipConfigurationsList,
  sipConfigurationsCreate,
  sipConfigurationsUpdate,
  sipConfigurationsDestroy,
  sipConfigurationsSetDefaultCreate,
  sipConfigurationsTestConnectionCreate,
  sipConfigurationsRetrieve,
} from "@/api/generated/api";
import type {
  SipConfigurationList,
  SipConfigurationDetail,
  SipConfiguration,
} from "@/api/generated/interfaces";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { isPbxAdmin } from "@/lib/backendPermissions";
import axiosInstance from "@/api/axios";

// ─── Constants ───────────────────────────────────────────────────────────────

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

/** Weekday name in the UI locale (index 0 = Monday; 2024-01-01 was a Monday, UTC). */
function dayLabel(index: number, locale: string, weekday: 'short' | 'long'): string {
  return new Intl.DateTimeFormat(locale, { weekday, timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + index)));
}

type WorkingHoursSchedule = Record<string, number[]>;

interface Holiday {
  date: string;
  name: string;
}

interface PbxSettings {
  id?: number;
  working_hours_enabled: boolean;
  timezone: string;
  working_hours: WorkingHoursSchedule;
  holidays: Holiday[];
  after_hours_action: 'announcement' | 'voicemail' | 'forward';
  forward_number: string;
  review_method: string;
  sms_api_key: string;
  sms_rating_template_ka: string;
  sms_rating_template_en: string;
  review_delay_hours: number;
  review_cooldown_hours: number;
  sound_greeting_url: string | null;
  sound_after_hours_url: string | null;
  sound_queue_hold_url: string | null;
  sound_voicemail_prompt_url: string | null;
  sound_thank_you_url: string | null;
  sound_transfer_hold_url: string | null;
  sound_review_prompt_url: string | null;
  sound_review_invalid_url: string | null;
  sound_review_thanks_url: string | null;
  sound_queue_position_1_url: string | null;
  sound_queue_position_2_url: string | null;
  sound_queue_position_3_url: string | null;
  sound_queue_position_4_url: string | null;
  sound_queue_position_5_url: string | null;
  sound_queue_position_6_url: string | null;
  sound_queue_position_7_url: string | null;
  sound_queue_position_8_url: string | null;
  sound_queue_position_9_url: string | null;
  sound_queue_position_10_url: string | null;
}

const DEFAULT_PBX_SETTINGS: PbxSettings = {
  working_hours_enabled: false,
  timezone: 'UTC',
  working_hours: {
    monday: [9, 10, 11, 12, 13, 14, 15, 16, 17],
    tuesday: [9, 10, 11, 12, 13, 14, 15, 16, 17],
    wednesday: [9, 10, 11, 12, 13, 14, 15, 16, 17],
    thursday: [9, 10, 11, 12, 13, 14, 15, 16, 17],
    friday: [9, 10, 11, 12, 13, 14, 15, 16, 17],
    saturday: [],
    sunday: [],
  },
  holidays: [],
  after_hours_action: 'announcement',
  forward_number: '',
  review_method: 'none',
  sms_api_key: '',
  sms_rating_template_ka: '',
  sms_rating_template_en: '',
  review_delay_hours: 1,
  review_cooldown_hours: 24,
  sound_greeting_url: null,
  sound_after_hours_url: null,
  sound_queue_hold_url: null,
  sound_voicemail_prompt_url: null,
  sound_thank_you_url: null,
  sound_transfer_hold_url: null,
  sound_review_prompt_url: null,
  sound_review_invalid_url: null,
  sound_review_thanks_url: null,
  sound_queue_position_1_url: null,
  sound_queue_position_2_url: null,
  sound_queue_position_3_url: null,
  sound_queue_position_4_url: null,
  sound_queue_position_5_url: null,
  sound_queue_position_6_url: null,
  sound_queue_position_7_url: null,
  sound_queue_position_8_url: null,
  sound_queue_position_9_url: null,
  sound_queue_position_10_url: null,
};

const SOUND_TYPES = [
  { key: 'greeting', urlField: 'sound_greeting_url', titleKey: 'soundGreeting', descKey: 'soundGreetingDesc' },
  { key: 'after_hours', urlField: 'sound_after_hours_url', titleKey: 'soundAfterHours', descKey: 'soundAfterHoursDesc' },
  { key: 'queue_hold', urlField: 'sound_queue_hold_url', titleKey: 'soundQueueHold', descKey: 'soundQueueHoldDesc' },
  { key: 'voicemail_prompt', urlField: 'sound_voicemail_prompt_url', titleKey: 'soundVoicemailPrompt', descKey: 'soundVoicemailPromptDesc' },
  { key: 'thank_you', urlField: 'sound_thank_you_url', titleKey: 'soundThankYou', descKey: 'soundThankYouDesc' },
  { key: 'transfer_hold', urlField: 'sound_transfer_hold_url', titleKey: 'soundTransferHold', descKey: 'soundTransferHoldDesc' },
  { key: 'review_prompt', urlField: 'sound_review_prompt_url', titleKey: 'soundReviewPrompt', descKey: 'soundReviewPromptDesc' },
  { key: 'review_invalid', urlField: 'sound_review_invalid_url', titleKey: 'soundReviewInvalid', descKey: 'soundReviewInvalidDesc' },
  { key: 'review_thanks', urlField: 'sound_review_thanks_url', titleKey: 'soundReviewThanks', descKey: 'soundReviewThanksDesc' },
] as const;

const QUEUE_POSITION_SOUND_TYPES = [
  { key: 'queue_position_1', urlField: 'sound_queue_position_1_url', titleKey: 'soundQueuePosition1', descKey: 'soundQueuePosition1Desc' },
  { key: 'queue_position_2', urlField: 'sound_queue_position_2_url', titleKey: 'soundQueuePosition2', descKey: 'soundQueuePosition2Desc' },
  { key: 'queue_position_3', urlField: 'sound_queue_position_3_url', titleKey: 'soundQueuePosition3', descKey: 'soundQueuePosition3Desc' },
  { key: 'queue_position_4', urlField: 'sound_queue_position_4_url', titleKey: 'soundQueuePosition4', descKey: 'soundQueuePosition4Desc' },
  { key: 'queue_position_5', urlField: 'sound_queue_position_5_url', titleKey: 'soundQueuePosition5', descKey: 'soundQueuePosition5Desc' },
  { key: 'queue_position_6', urlField: 'sound_queue_position_6_url', titleKey: 'soundQueuePosition6', descKey: 'soundQueuePosition6Desc' },
  { key: 'queue_position_7', urlField: 'sound_queue_position_7_url', titleKey: 'soundQueuePosition7', descKey: 'soundQueuePosition7Desc' },
  { key: 'queue_position_8', urlField: 'sound_queue_position_8_url', titleKey: 'soundQueuePosition8', descKey: 'soundQueuePosition8Desc' },
  { key: 'queue_position_9', urlField: 'sound_queue_position_9_url', titleKey: 'soundQueuePosition9', descKey: 'soundQueuePosition9Desc' },
  { key: 'queue_position_10', urlField: 'sound_queue_position_10_url', titleKey: 'soundQueuePosition10', descKey: 'soundQueuePosition10Desc' },
] as const;

// ─── Working Hours Grid ──────────────────────────────────────────────────────

function WorkingHoursGrid({
  schedule,
  onChange,
  disabled,
}: {
  schedule: WorkingHoursSchedule;
  onChange: (schedule: WorkingHoursSchedule) => void;
  disabled?: boolean;
}) {
  const ts = useTranslations("callsSettings");
  const locale = useLocale();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'select' | 'deselect'>('select');

  const safeSchedule = schedule || {};

  const isSelected = (day: string, hour: number) => {
    const daySchedule = safeSchedule[day] || [];
    return daySchedule.includes(hour);
  };

  const toggleCell = (day: string, hour: number) => {
    if (disabled) return;
    const daySchedule = safeSchedule[day] || [];
    const newDaySchedule = isSelected(day, hour)
      ? daySchedule.filter(h => h !== hour)
      : [...daySchedule, hour].sort((a, b) => a - b);
    onChange({ ...safeSchedule, [day]: newDaySchedule });
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
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="flex mb-px">
            <div className="w-20 shrink-0 text-sm font-medium capitalize py-1">
              {dayLabel(dayIndex, locale, 'short')}
            </div>
            <div className="flex flex-1 gap-px">
              {HOURS.map(hour => (
                <div
                  key={`${day}-${hour}`}
                  className={`
                    flex-1 h-6 rounded-sm cursor-pointer transition-colors select-none
                    ${isSelected(day, hour)
                      ? 'bg-primary hover:bg-primary/80'
                      : 'bg-muted hover:bg-muted-foreground/20'
                    }
                    ${disabled ? 'cursor-not-allowed opacity-50' : ''}
                  `}
                  onMouseDown={() => handleMouseDown(day, hour)}
                  onMouseEnter={() => handleMouseEnter(day, hour)}
                  title={ts('sip.hourRange', { day: dayLabel(dayIndex, locale, 'long'), from: hour, to: hour + 1 })}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-primary" />
            <span>{ts("working")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-muted" />
            <span>{ts("closed")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sound Row ───────────────────────────────────────────────────────────────

function SoundRow({
  title,
  description,
  soundUrl,
  onUpload,
  onRemove,
  uploading,
}: {
  title: string;
  description: string;
  soundUrl: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  uploading: boolean;
}) {
  const ts = useTranslations("callsSettings");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tooLarge, setTooLarge] = useState(false);

  const fileName = soundUrl ? soundUrl.split('/').pop() || 'custom sound' : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit: say so (it used to ignore the file silently) and let the
      // same file be picked again.
      setTooLarge(true);
      e.target.value = '';
      return;
    }
    setTooLarge(false);
    onUpload(file);
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <FieldRow
      label={title}
      help={
        <>
          {description}
          {tooLarge && (
            <span role="alert" className="mt-1 block text-destructive">{ts("fileTooLarge")}</span>
          )}
        </>
      }
      testId="sound-row"
    >
      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-[320px]">
        {soundUrl ? (
          <>
            <span className="truncate font-mono text-[11px] text-muted-foreground" title={fileName ?? undefined}>
              {fileName}
            </span>
            <audio controls preload="none" className="h-8 w-full">
              <source src={soundUrl} />
            </audio>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">{ts("noCustomSound")}</span>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.ogg"
            className="hidden"
            onChange={handleFileChange}
          />
          <ActionButton
            icon={uploading ? undefined : Upload}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            testId="sound-upload"
          >
            {uploading && <Loader2 className="h-[13px] w-[13px] animate-spin" aria-hidden />}
            {ts("uploadSound")}
          </ActionButton>
          {soundUrl && (
            <ActionButton icon={Trash2} tone="danger" onClick={onRemove} disabled={uploading} testId="sound-remove">
              {ts("removeSound")}
            </ActionButton>
          )}
        </div>
      </div>
    </FieldRow>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function CallSettingsPage() {
  const t = useTranslations("calls");
  const ts = useTranslations("callsSettings");
  const tCommon = useTranslations("common");
  const tPbx = useTranslations("pbxSettings");
  const { toast } = useToast();
  // Every write here (and the SIP config list) needs a PBX admin: staff,
  // superuser or manage_settings, as in crm/permissions.py.
  const { user } = useAuth();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const canManagePbx =
    Boolean(user?.is_staff || user?.is_superuser) || isPbxAdmin(userProfile as never);

  // ── SIP Config State (Tab 1 - existing) ──
  const [sipConfigs, setSipConfigs] = useState<SipConfigurationList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] =
    useState<SipConfigurationDetail | null>(null);
  const [configForm, setConfigForm] = useState<
    Partial<SipConfigurationDetail>
  >({
    name: "",
    sip_server: "",
    sip_port: 5060,
    username: "",
    password: "",
    realm: "",
    proxy: "",
    stun_server: "",
    turn_server: "",
    turn_username: "",
    turn_password: "",
    is_active: true,
    is_default: false,
    max_concurrent_calls: 5,
  });
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Working Hours State (Tab 2) ──
  const [selectedSipConfigId, setSelectedSipConfigId] = useState<string>("");
  const [pbxSettings, setPbxSettings] = useState<PbxSettings>(DEFAULT_PBX_SETTINGS);
  const [pbxLoading, setPbxLoading] = useState(false);
  const [pbxSaving, setPbxSaving] = useState(false);
  // Last loaded / saved working-hours values (save bar dirty check + Discard).
  const [pbxLoaded, setPbxLoaded] = useState<PbxSettings | null>(null);
  const [activeTab, setActiveTab] = useState<"sip" | "working-hours" | "sounds">("sip");

  // ── Sound Management State (Tab 3) ──
  const [soundSipConfigId, setSoundSipConfigId] = useState<string>("");
  const [soundSettings, setSoundSettings] = useState<PbxSettings>(DEFAULT_PBX_SETTINGS);
  const [soundLoading, setSoundLoading] = useState(false);
  const [uploadingSoundType, setUploadingSoundType] = useState<string | null>(null);

  // ── Fetch SIP Configs ──
  useEffect(() => {
    fetchSipConfigs();
  }, []);

  const fetchSipConfigs = async () => {
    try {
      setLoading(true);
      const response = await sipConfigurationsList();
      setSipConfigs(response.results);
      setError("");
    } catch (err: unknown) {
      console.error("Failed to fetch SIP configs:", err);
      setError(ts("sip.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ── SIP Config CRUD (Tab 1 - existing logic) ──
  const openModal = (config?: SipConfigurationList) => {
    if (config) {
      loadConfigForEdit(config.id);
    } else {
      setEditingConfig(null);
      setConfigForm({
        name: "",
        sip_server: "",
        sip_port: 5060,
        username: "",
        realm: "",
        proxy: "",
        stun_server: "",
        turn_server: "",
        turn_username: "",
        is_active: true,
        is_default: false,
        max_concurrent_calls: 5,
      });
    }
    setShowModal(true);
  };

  const loadConfigForEdit = async (configId: number) => {
    try {
      const config = await sipConfigurationsRetrieve(configId);
      setEditingConfig(config);
      setConfigForm({
        name: config.name,
        sip_server: config.sip_server,
        sip_port: config.sip_port,
        username: config.username,
        password: "",
        realm: config.realm || "",
        proxy: config.proxy || "",
        stun_server: config.stun_server || "",
        turn_server: config.turn_server || "",
        turn_username: config.turn_username || "",
        // Without these the edit dialog showed Active / Default unticked,
        // 5 max calls, "/ws" and an empty trunk number whatever was stored.
        phone_number: config.phone_number || "",
        websocket_path: config.websocket_path || "/ws",
        is_active: config.is_active,
        is_default: config.is_default,
        max_concurrent_calls: config.max_concurrent_calls,
      });
      setShowModal(true);
    } catch (error) {
      console.error("Error loading SIP configuration:", error);
      toast({
        title: ts("error"),
        description: ts("sip.loadOneFailed"),
        variant: "destructive",
      });
    }
  };

  const setupAsteriskServer = () => {
    setEditingConfig(null);
    setConfigForm({
      name: "EchoDesk Asterisk Server",
      sip_server: "165.227.166.42",
      sip_port: 8089,
      username: "1001",
      password: "Giorgi123.",
      realm: "165.227.166.42",
      proxy: "",
      stun_server: "stun:stun.l.google.com:19302",
      turn_server: "",
      turn_username: "",
      turn_password: "",
      is_active: true,
      is_default: true,
      max_concurrent_calls: 5,
    });
    setShowModal(true);
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      if (editingConfig) {
        await sipConfigurationsUpdate(editingConfig.id, configForm as any);
        toast({
          title: ts("success"),
          description: ts("sip.updated"),
        });
      } else {
        // The form asks for the trunk password on create (it is required
        // there), so send it: dropping it left new configs without one.
        const createData = {
          ...configForm,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          id: 0,
        } as SipConfiguration;
        await sipConfigurationsCreate(createData);
        toast({
          title: ts("success"),
          description: ts("sip.created"),
        });
      }

      await fetchSipConfigs();
      setShowModal(false);
      setError("");
    } catch (err: unknown) {
      console.error("Failed to save SIP config:", err);
      toast({
        title: ts("error"),
        description: ts("sip.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async (configId: number) => {
    if (!confirm(ts("sip.deleteConfirm"))) {
      return;
    }

    try {
      setActionLoading(configId);
      await sipConfigurationsDestroy(configId);
      await fetchSipConfigs();
      setError("");
      toast({
        title: ts("success"),
        description: ts("sip.deleted"),
      });
    } catch (err: unknown) {
      console.error("Failed to delete SIP config:", err);
      toast({
        title: ts("error"),
        description: ts("sip.deleteFailed"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const setDefaultConfig = async (configId: number) => {
    try {
      setActionLoading(configId);
      const config = await sipConfigurationsRetrieve(configId);
      await sipConfigurationsSetDefaultCreate(configId, config as any);
      await fetchSipConfigs();
      setError("");
      toast({
        title: ts("success"),
        description: ts("sip.defaultUpdated"),
      });
    } catch (err: unknown) {
      console.error("Failed to set default SIP config:", err);
      toast({
        title: ts("error"),
        description: ts("sip.defaultFailed"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const testConnection = async (config: SipConfigurationList) => {
    try {
      setActionLoading(config.id);
      const fullConfig = await sipConfigurationsRetrieve(config.id);
      const result = await sipConfigurationsTestConnectionCreate(
        config.id,
        fullConfig as any
      );
      toast({
        title: result.success ? ts("sip.testOk") : ts("sip.testFailed"),
        description: result.message || "",
        variant: result.success ? "default" : "destructive",
      });
    } catch (err: unknown) {
      console.error("Failed to test SIP config:", err);
      toast({
        title: ts("error"),
        description: ts("sip.testError"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const updateFormField = (field: string, value: any) => {
    setConfigForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ── PBX Settings API (Working Hours + Sounds) ──
  const fetchPbxSettings = useCallback(async (sipConfigId: string) => {
    if (!sipConfigId) return;
    try {
      const response = await axiosInstance.get(`/api/pbx-settings/${sipConfigId}/`);
      const data = response.data;
      // Map backend field names to frontend
      return {
        ...data,
        working_hours: data.working_hours_schedule || {},
        holidays: data.holidays || [],
      } as PbxSettings;
    } catch (err: unknown) {
      console.error("Failed to fetch PBX settings:", err);
      return null;
    }
  }, []);

  // Load PBX settings when working hours SIP config changes
  useEffect(() => {
    if (!selectedSipConfigId) return;
    let cancelled = false;
    setPbxLoading(true);
    fetchPbxSettings(selectedSipConfigId).then((data) => {
      if (cancelled) return;
      if (data) {
        setPbxSettings(data);
        setPbxLoaded(data);
      } else {
        setPbxSettings(DEFAULT_PBX_SETTINGS);
        setPbxLoaded(DEFAULT_PBX_SETTINGS);
      }
      setPbxLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedSipConfigId, fetchPbxSettings]);

  // Load PBX settings when sounds SIP config changes
  useEffect(() => {
    if (!soundSipConfigId) return;
    let cancelled = false;
    setSoundLoading(true);
    fetchPbxSettings(soundSipConfigId).then((data) => {
      if (cancelled) return;
      if (data) {
        setSoundSettings(data);
      } else {
        setSoundSettings(DEFAULT_PBX_SETTINGS);
      }
      setSoundLoading(false);
    });
    return () => { cancelled = true; };
  }, [soundSipConfigId, fetchPbxSettings]);

  const saveWorkingHours = async () => {
    if (!selectedSipConfigId) return;
    try {
      setPbxSaving(true);
      await axiosInstance.patch(`/api/pbx-settings/${selectedSipConfigId}/`, {
        working_hours_enabled: pbxSettings.working_hours_enabled,
        timezone: pbxSettings.timezone,
        working_hours_schedule: pbxSettings.working_hours,
        holidays: pbxSettings.holidays,
        after_hours_action: pbxSettings.after_hours_action,
        forward_number: pbxSettings.forward_number,
        review_method: pbxSettings.review_method,
        sms_api_key: pbxSettings.sms_api_key,
        sms_rating_template_ka: pbxSettings.sms_rating_template_ka,
        sms_rating_template_en: pbxSettings.sms_rating_template_en,
        review_delay_hours: pbxSettings.review_delay_hours,
        review_cooldown_hours: pbxSettings.review_cooldown_hours,
      });
      setPbxLoaded(pbxSettings);
      toast({
        title: ts("success"),
        description: ts("saved"),
      });
    } catch (err: unknown) {
      console.error("Failed to save working hours:", err);
      toast({
        title: ts("error"),
        description: ts("saveFailed"),
        variant: "destructive",
      });
    } finally {
      setPbxSaving(false);
    }
  };

  const uploadSound = async (sipConfigId: string, soundType: string, file: File) => {
    try {
      setUploadingSoundType(soundType);
      const formData = new FormData();
      formData.append('sound_type', soundType);
      formData.append('file', file);
      const response = await axiosInstance.post(
        `/api/pbx-settings/${sipConfigId}/upload-sound/`,
        formData
      );
      // Refresh settings to get updated URLs
      const data = await fetchPbxSettings(sipConfigId);
      if (data) {
        setSoundSettings(data);
        // Also update working hours settings if same config
        if (sipConfigId === selectedSipConfigId) {
          setPbxSettings(data);
          setPbxLoaded(data);
        }
      }
      toast({
        title: ts("success"),
        description: ts("saved"),
      });
    } catch (err: unknown) {
      console.error("Failed to upload sound:", err);
      toast({
        title: ts("error"),
        description: ts("uploadFailed"),
        variant: "destructive",
      });
    } finally {
      setUploadingSoundType(null);
    }
  };

  const removeSound = async (sipConfigId: string, soundType: string) => {
    try {
      setUploadingSoundType(soundType);
      await axiosInstance.post(
        `/api/pbx-settings/${sipConfigId}/remove-sound/`,
        { sound_type: soundType }
      );
      // Refresh settings to get updated URLs
      const data = await fetchPbxSettings(sipConfigId);
      if (data) {
        setSoundSettings(data);
        if (sipConfigId === selectedSipConfigId) {
          setPbxSettings(data);
          setPbxLoaded(data);
        }
      }
      toast({
        title: ts("success"),
        description: ts("saved"),
      });
    } catch (err: unknown) {
      console.error("Failed to remove sound:", err);
      toast({
        title: ts("error"),
        description: ts("removeFailed"),
        variant: "destructive",
      });
    } finally {
      setUploadingSoundType(null);
    }
  };

  // ── Working-hours save bar (same save, new place) ──
  const savedFieldsOf = (p: PbxSettings) =>
    JSON.stringify([
      p.working_hours_enabled,
      p.timezone,
      p.working_hours,
      p.holidays,
      p.after_hours_action,
      p.forward_number,
      p.review_method,
      p.sms_api_key,
      p.sms_rating_template_ka,
      p.sms_rating_template_en,
      p.review_delay_hours,
      p.review_cooldown_hours,
    ]);
  const pbxDirty = pbxLoaded != null && savedFieldsOf(pbxSettings) !== savedFieldsOf(pbxLoaded);
  const discardWorkingHours = () => {
    if (pbxLoaded) setPbxSettings(pbxLoaded);
  };

  const configSelect = (value: string, onChange: (v: string) => void, testId: string) =>
    sipConfigs.length === 0 ? (
      <p className="text-xs text-muted-foreground">{ts("noSipConfigs")}</p>
    ) : (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(settingsFieldWidth, "h-[34px] text-[13px]")} data-testid={testId}>
          <SelectValue placeholder={ts("selectSipConfig")} />
        </SelectTrigger>
        <SelectContent>
          {sipConfigs.map((config) => (
            <SelectItem key={config.id} value={String(config.id)}>
              {config.name} {config.is_default ? ts("sip.defaultSuffix") : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );

  // ── Render ──
  if (!profileLoading && !canManagePbx) {
    return (
      <SettingsPage icon={Phone} title={t("settings.title")} width="wide" testId="calls-settings">
        <div className="rounded-[10px] border bg-card" data-testid="calls-no-access">
          <EmptyState
            icon={Lock}
            title={tPbx("page.noAccessTitle")}
            description={tPbx("page.noAccessDescription")}
          />
        </div>
      </SettingsPage>
    );
  }

  return (
    <FeatureGate
      feature="ip_calling"
      showUpgrade={true}
      fallback={
        <SettingsPage icon={Phone} title={t("settings.title")} width="wide" testId="calls-settings">
          <div className="rounded-[10px] border bg-card" data-testid="calls-upgrade">
            <EmptyState
              icon={Lock}
              title={tPbx("page.upgradeTitle")}
              description={tPbx("page.upgradeDescription")}
              action={
                <Link href="/settings/subscription" className={rdButton.outline}>
                  {ts("upgradePlan")}
                </Link>
              }
            />
          </div>
        </SettingsPage>
      }
    >
      <SettingsPage
        icon={Phone}
        title={t("settings.title")}
        description={t("settings.subtitle")}
        width="wide"
        testId="calls-settings"
      >
        <Segmented
          size="md"
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel={ts("tabsLabel")}
          className="self-start"
          testId="calls-tabs"
          options={[
            { value: "sip", label: ts("sipTab") },
            { value: "working-hours", label: ts("workingHoursTab") },
            { value: "sounds", label: ts("soundsTab") },
          ]}
        />

        {/* ── Tab 1: SIP Configurations ── */}
        {activeTab === "sip" && (
          <>
            <SettingsSection
              title={ts("configsTitle")}
              actions={
                <>
                  <ActionButton icon={Zap} onClick={setupAsteriskServer} testId="sip-quick-setup">
                    {t("settings.quickSetup")}
                  </ActionButton>
                  <button
                    type="button"
                    className={cn(rdButton.primarySm, "h-[30px] px-2.5")}
                    onClick={() => openModal()}
                    data-testid="sip-add"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    {t("settings.addConfiguration")}
                  </button>
                </>
              }
              testId="sip-configs"
            >
              {error && (
                <div className="border-b px-4 py-3">
                  <SettingsNote tone="danger">{error}</SettingsNote>
                </div>
              )}
              {loading ? (
                <LoadingBlock label={tCommon("loading")} className="py-10" />
              ) : (
                <SipConfigList
                  configs={sipConfigs}
                  onEdit={openModal}
                  onDelete={deleteConfig}
                  onSetDefault={setDefaultConfig}
                  onTest={testConnection}
                  actionLoading={actionLoading}
                />
              )}
            </SettingsSection>

            {/* User Phone Assignments per SIP Config */}
            {sipConfigs.map((config) => (
              <UserPhoneAssignments
                key={config.id}
                sipConfigId={config.id}
                sipConfigName={config.name}
              />
            ))}

            {/* Configuration Modal */}
            <SipConfigForm
              open={showModal}
              onClose={() => setShowModal(false)}
              onSave={saveConfig}
              configForm={configForm}
              updateFormField={updateFormField}
              editingConfig={editingConfig}
              saving={saving}
            />
          </>
        )}

        {/* ── Tab 2: Working Hours ── */}
        {activeTab === "working-hours" && (
          <>
            <SettingsSection title={ts("configTitle")}>
              <FieldRow label={ts("selectSipConfig")} align="center">
                {configSelect(selectedSipConfigId, setSelectedSipConfigId, "hours-config")}
              </FieldRow>
            </SettingsSection>

            {selectedSipConfigId && (
              pbxLoading ? (
                <div className="rounded-[10px] border bg-card">
                  <LoadingBlock label={tCommon("loading")} />
                </div>
              ) : (
                <>
                  <SettingsSection title={ts("workingHoursTab")} hint={ts("workingHoursDescription")} testId="hours-main">
                    <FieldRow label={ts("workingHoursEnabled")} htmlFor="wh-enabled" align="center">
                      <SettingsToggle
                        id="wh-enabled"
                        checked={pbxSettings.working_hours_enabled}
                        onCheckedChange={(checked) =>
                          setPbxSettings((prev) => ({ ...prev, working_hours_enabled: checked }))
                        }
                      />
                    </FieldRow>
                    <FieldRow label={ts("timezone")} align="center">
                      <Select
                        value={pbxSettings.timezone}
                        onValueChange={(value) =>
                          setPbxSettings((prev) => ({ ...prev, timezone: value }))
                        }
                      >
                        <SelectTrigger className={cn(settingsFieldWidth, "h-[34px] text-[13px]")} data-testid="hours-timezone">
                          <SelectValue placeholder={ts("selectTimezone")} />
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
                  </SettingsSection>

                  <SettingsSection title={ts("scheduleTitle")} hint={ts("scheduleHint")} testId="hours-grid">
                    <div className="px-4 py-3.5">
                      <WorkingHoursGrid
                        schedule={pbxSettings.working_hours}
                        onChange={(schedule) =>
                          setPbxSettings((prev) => ({ ...prev, working_hours: schedule }))
                        }
                      />
                    </div>
                  </SettingsSection>

                  <SettingsSection title={ts("afterHoursAction")} testId="hours-after">
                    <FieldRow label={ts("afterHoursAction")} align="center">
                      <ChoiceControl<'announcement' | 'voicemail' | 'forward'>
                        value={pbxSettings.after_hours_action}
                        onChange={(value) =>
                          setPbxSettings((prev) => ({ ...prev, after_hours_action: value }))
                        }
                        ariaLabel={ts("afterHoursAction")}
                        testId="hours-after-action"
                        options={[
                          { value: "announcement", label: ts("playAnnouncement") },
                          { value: "voicemail", label: ts("voicemail") },
                          { value: "forward", label: ts("forwardCall") },
                        ]}
                      />
                    </FieldRow>
                    {pbxSettings.after_hours_action === 'forward' && (
                      <FieldRow label={ts("forwardNumber")} htmlFor="wh-forward" align="center">
                        <input
                          id="wh-forward"
                          type="tel"
                          placeholder="+1234567890"
                          className={cn(settingsInputClass, settingsFieldWidth)}
                          value={pbxSettings.forward_number}
                          onChange={(e) =>
                            setPbxSettings((prev) => ({ ...prev, forward_number: e.target.value }))
                          }
                        />
                      </FieldRow>
                    )}
                  </SettingsSection>

                  <SettingsSection
                    title={ts("holidays")}
                    hint={ts("holidaysDescription")}
                    testId="hours-holidays"
                    actions={
                      <ActionButton
                        icon={Plus}
                        testId="holiday-add"
                        onClick={() => {
                          const updated = [...(pbxSettings.holidays || []), { date: '', name: '' }];
                          setPbxSettings((prev) => ({ ...prev, holidays: updated }));
                        }}
                      >
                        {ts("addHoliday")}
                      </ActionButton>
                    }
                  >
                    {(pbxSettings.holidays || []).map((holiday, index) => (
                      <div key={index} className="flex flex-col gap-2 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-center" data-testid="holiday-row">
                        <input
                          type="date"
                          aria-label={ts("holidayDate")}
                          value={holiday.date}
                          onChange={(e) => {
                            const updated = [...pbxSettings.holidays];
                            updated[index] = { ...updated[index], date: e.target.value };
                            setPbxSettings((prev) => ({ ...prev, holidays: updated }));
                          }}
                          className={cn(settingsInputClass, "sm:w-44")}
                        />
                        <input
                          aria-label={ts("holidayName")}
                          value={holiday.name}
                          placeholder={ts("holidayNamePlaceholder")}
                          onChange={(e) => {
                            const updated = [...pbxSettings.holidays];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setPbxSettings((prev) => ({ ...prev, holidays: updated }));
                          }}
                          className={cn(settingsInputClass, "flex-1")}
                        />
                        <button
                          type="button"
                          aria-label={ts("deleteHoliday")}
                          title={ts("deleteHoliday")}
                          className={cn(rdButton.ghostIconSm, "self-end hover:bg-destructive/10 hover:text-destructive sm:self-auto")}
                          onClick={() => {
                            const updated = pbxSettings.holidays.filter((_, i) => i !== index);
                            setPbxSettings((prev) => ({ ...prev, holidays: updated }));
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    ))}
                    {(!pbxSettings.holidays || pbxSettings.holidays.length === 0) && (
                      <p className="px-4 py-5 text-center text-[13px] text-muted-foreground">{ts("noHolidays")}</p>
                    )}
                  </SettingsSection>

                  <SettingsSection title={ts("reviewSettings")} hint={ts("reviewSettingsDesc")} testId="hours-review">
                    <FieldRow label={ts("reviewMethod")} align="center">
                      <ChoiceControl<string>
                        value={pbxSettings.review_method}
                        onChange={(value) =>
                          setPbxSettings((prev) => ({ ...prev, review_method: value }))
                        }
                        ariaLabel={ts("reviewMethod")}
                        testId="review-method"
                        options={[
                          { value: "none", label: ts("reviewDisabled") },
                          { value: "callback", label: ts("reviewCallback") },
                          { value: "sms", label: ts("reviewSms") },
                          { value: "both", label: ts("reviewBoth") },
                        ]}
                      />
                    </FieldRow>

                    {/* SMS Settings — shown when sms or both */}
                    {(pbxSettings.review_method === 'sms' || pbxSettings.review_method === 'both') && (
                      <>
                        <FieldRow label={ts("smsApiKey")} htmlFor="review-sms-key" align="center">
                          <SecretInput
                            id="review-sms-key"
                            className={settingsFieldWidth}
                            value={pbxSettings.sms_api_key}
                            onChange={(v) => setPbxSettings((prev) => ({ ...prev, sms_api_key: v }))}
                            placeholder="sender.ge API key"
                            showLabel={tPbx("secret.show")}
                            hideLabel={tPbx("secret.hide")}
                          />
                        </FieldRow>
                        <FieldRow label={ts("smsTemplateKa")} htmlFor="review-sms-ka" help={ts("smsTemplatePlaceholder")}>
                          <Textarea
                            id="review-sms-ka"
                            value={pbxSettings.sms_rating_template_ka}
                            onChange={(e) =>
                              setPbxSettings((prev) => ({ ...prev, sms_rating_template_ka: e.target.value }))
                            }
                            placeholder={`გმადლობთ! შეაფასეთ: {link}`}
                            rows={2}
                            className={cn(settingsFieldWidth, "resize-none text-[13px]")}
                          />
                        </FieldRow>
                        <FieldRow label={ts("smsTemplateEn")} htmlFor="review-sms-en" help={ts("smsTemplatePlaceholder")}>
                          <Textarea
                            id="review-sms-en"
                            value={pbxSettings.sms_rating_template_en}
                            onChange={(e) =>
                              setPbxSettings((prev) => ({ ...prev, sms_rating_template_en: e.target.value }))
                            }
                            placeholder="Thank you! Rate us: {link}"
                            rows={2}
                            className={cn(settingsFieldWidth, "resize-none text-[13px]")}
                          />
                        </FieldRow>
                      </>
                    )}

                    <FieldRow label={ts("reviewDelay")} htmlFor="review-delay" help={ts("reviewDelayDesc")} align="center">
                      <input
                        id="review-delay"
                        type="number"
                        min={0}
                        className={cn(settingsInputClass, "w-full sm:w-[120px]")}
                        value={pbxSettings.review_delay_hours}
                        onChange={(e) =>
                          setPbxSettings((prev) => ({ ...prev, review_delay_hours: Number(e.target.value) }))
                        }
                      />
                    </FieldRow>
                    <FieldRow label={ts("reviewCooldown")} htmlFor="review-cooldown" help={ts("reviewCooldownDesc")} align="center">
                      <input
                        id="review-cooldown"
                        type="number"
                        min={0}
                        className={cn(settingsInputClass, "w-full sm:w-[120px]")}
                        value={pbxSettings.review_cooldown_hours}
                        onChange={(e) =>
                          setPbxSettings((prev) => ({ ...prev, review_cooldown_hours: Number(e.target.value) }))
                        }
                      />
                    </FieldRow>
                  </SettingsSection>

                  {/* The old always-visible Save button, now in the sticky save bar. */}
                  <StickySaveBar
                    mode="always"
                    dirty={pbxDirty}
                    saving={pbxSaving}
                    onSave={saveWorkingHours}
                    onDiscard={discardWorkingHours}
                    labels={{
                      unsaved: ts("saveBar.unsaved"),
                      discard: ts("saveBar.discard"),
                      save: ts("save"),
                      saving: ts("saving"),
                      saved: ts("saveBar.saved"),
                    }}
                    testId="calls-savebar"
                  />
                </>
              )
            )}
          </>
        )}

        {/* ── Tab 3: Sound Management ── */}
        {activeTab === "sounds" && (
          <>
            <SettingsSection title={ts("configTitle")}>
              <FieldRow label={ts("selectSipConfig")} align="center">
                {configSelect(soundSipConfigId, setSoundSipConfigId, "sounds-config")}
              </FieldRow>
            </SettingsSection>

            {soundSipConfigId && (
              soundLoading ? (
                <div className="rounded-[10px] border bg-card">
                  <LoadingBlock label={tCommon("loading")} />
                </div>
              ) : (
                <>
                  <SettingsSection title={ts("soundsTitle")} hint={ts("soundRequirements")} testId="sounds-main">
                    {SOUND_TYPES.map((sound) => (
                      <SoundRow
                        key={sound.key}
                        title={ts(sound.titleKey)}
                        description={ts(sound.descKey)}
                        soundUrl={soundSettings[sound.urlField as keyof PbxSettings] as string | null}
                        onUpload={(file) => uploadSound(soundSipConfigId, sound.key, file)}
                        onRemove={() => removeSound(soundSipConfigId, sound.key)}
                        uploading={uploadingSoundType === sound.key}
                      />
                    ))}
                  </SettingsSection>

                  {/* Queue Position Announcements */}
                  <SettingsSection title={ts("queuePositionTitle")} hint={ts("queuePositionDescription")} testId="sounds-queue">
                    {QUEUE_POSITION_SOUND_TYPES.map((sound) => (
                      <SoundRow
                        key={sound.key}
                        title={ts(sound.titleKey)}
                        description={ts(sound.descKey)}
                        soundUrl={soundSettings[sound.urlField as keyof PbxSettings] as string | null}
                        onUpload={(file) => uploadSound(soundSipConfigId, sound.key, file)}
                        onRemove={() => removeSound(soundSipConfigId, sound.key)}
                        uploading={uploadingSoundType === sound.key}
                      />
                    ))}
                  </SettingsSection>
                </>
              )
            )}
          </>
        )}
      </SettingsPage>
    </FeatureGate>
  );
}
