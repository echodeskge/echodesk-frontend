"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { SipConfigForm } from "@/components/calls/SipConfigForm";
import { SipConfigList } from "@/components/calls/SipConfigList";
import { UserPhoneAssignments } from "@/components/calls/UserPhoneAssignments";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Zap, Upload, Trash2, Loader2 } from "lucide-react";
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

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

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
        {DAYS.map(day => (
          <div key={day} className="flex mb-px">
            <div className="w-20 shrink-0 text-sm font-medium capitalize py-1">
              {DAY_LABELS[day]}
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
                  title={`${day.charAt(0).toUpperCase() + day.slice(1)} ${hour}:00 - ${hour + 1}:00`}
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

// ─── Sound Card ──────────────────────────────────────────────────────────────

function SoundCard({
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

  const fileName = soundUrl ? soundUrl.split('/').pop() || 'custom sound' : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      return; // 10MB limit
    }
    onUpload(file);
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          {soundUrl && (
            <Badge variant="secondary" className="shrink-0 max-w-[150px] sm:max-w-[200px] truncate">
              {fileName}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {soundUrl ? (
            <>
              <audio controls preload="none" className="h-8 flex-1">
                <source src={soundUrl} />
              </audio>
              <Button
                variant="destructive"
                size="sm"
                onClick={onRemove}
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {ts("removeSound")}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground flex-1">
              {ts("noCustomSound")}
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.ogg"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            {ts("uploadSound")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{ts("soundRequirements")}</p>
      </CardContent>
    </Card>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function CallSettingsPage() {
  const t = useTranslations("calls");
  const ts = useTranslations("callsSettings");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

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
      setError("Failed to load SIP configurations");
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
      });
      setShowModal(true);
    } catch (error) {
      console.error("Error loading SIP configuration:", error);
      toast({
        title: "Error",
        description: "Failed to load SIP configuration",
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
      const { password, turn_password, ...apiConfig } = configForm;

      if (editingConfig) {
        await sipConfigurationsUpdate(editingConfig.id, configForm as any);
        toast({
          title: "Success",
          description: "SIP configuration updated successfully",
        });
      } else {
        const createData = {
          ...apiConfig,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          id: 0,
        } as SipConfiguration;
        await sipConfigurationsCreate(createData);
        toast({
          title: "Success",
          description: "SIP configuration created successfully",
        });
      }

      await fetchSipConfigs();
      setShowModal(false);
      setError("");
    } catch (err: unknown) {
      console.error("Failed to save SIP config:", err);
      toast({
        title: "Error",
        description: "Failed to save SIP configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async (configId: number) => {
    if (!confirm("Are you sure you want to delete this SIP configuration?")) {
      return;
    }

    try {
      setActionLoading(configId);
      await sipConfigurationsDestroy(configId);
      await fetchSipConfigs();
      setError("");
      toast({
        title: "Success",
        description: "SIP configuration deleted successfully",
      });
    } catch (err: unknown) {
      console.error("Failed to delete SIP config:", err);
      toast({
        title: "Error",
        description: "Failed to delete SIP configuration",
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
        title: "Success",
        description: "Default SIP configuration updated",
      });
    } catch (err: unknown) {
      console.error("Failed to set default SIP config:", err);
      toast({
        title: "Error",
        description: "Failed to set default SIP configuration",
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
        title: result.success ? "Connection Successful" : "Connection Failed",
        description: result.message || "",
        variant: result.success ? "default" : "destructive",
      });
    } catch (err: unknown) {
      console.error("Failed to test SIP config:", err);
      toast({
        title: "Error",
        description: "Connection test failed",
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
      } else {
        setPbxSettings(DEFAULT_PBX_SETTINGS);
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
      });
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

  // ── Render ──
  return (
    <FeatureGate feature="ip_calling" showUpgrade={true}>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
          <p className="text-muted-foreground">
            {t("settings.subtitle")}
          </p>
        </div>

        <Tabs defaultValue="sip" className="space-y-6">
          <TabsList className="w-full sm:w-auto flex flex-col sm:flex-row h-auto sm:h-10 gap-1 sm:gap-0">
            <TabsTrigger value="sip" className="w-full sm:w-auto">{ts("sipTab")}</TabsTrigger>
            <TabsTrigger value="working-hours" className="w-full sm:w-auto">{ts("workingHoursTab")}</TabsTrigger>
            <TabsTrigger value="sounds" className="w-full sm:w-auto">{ts("soundsTab")}</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: SIP Configurations ── */}
          <TabsContent value="sip" className="space-y-6">
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <Button variant="outline" onClick={setupAsteriskServer}>
                <Zap className="h-4 w-4 mr-2" />
                {t("settings.quickSetup")}
              </Button>
              <Button onClick={() => openModal()}>
                <Plus className="h-4 w-4 mr-2" />
                {t("settings.addConfiguration")}
              </Button>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {loading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {tCommon("loading")}
                  </p>
                </CardContent>
              </Card>
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
          </TabsContent>

          {/* ── Tab 2: Working Hours ── */}
          <TabsContent value="working-hours" className="space-y-6">
            {/* SIP Config Selector */}
            <Card>
              <CardHeader>
                <CardTitle>{ts("selectSipConfig")}</CardTitle>
              </CardHeader>
              <CardContent>
                {sipConfigs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{ts("noSipConfigs")}</p>
                ) : (
                  <Select
                    value={selectedSipConfigId}
                    onValueChange={setSelectedSipConfigId}
                  >
                    <SelectTrigger className="w-full max-w-sm">
                      <SelectValue placeholder={ts("selectSipConfig")} />
                    </SelectTrigger>
                    <SelectContent>
                      {sipConfigs.map((config) => (
                        <SelectItem key={config.id} value={String(config.id)}>
                          {config.name} {config.is_default ? "(Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {selectedSipConfigId && (
              <>
                {pbxLoading ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">{tCommon("loading")}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Enable/Disable Switch */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <Label className="text-base font-medium">{ts("workingHoursEnabled")}</Label>
                            <p className="text-sm text-muted-foreground">
                              {ts("workingHoursDescription")}
                            </p>
                          </div>
                          <Switch
                            checked={pbxSettings.working_hours_enabled}
                            onCheckedChange={(checked) =>
                              setPbxSettings((prev) => ({ ...prev, working_hours_enabled: checked }))
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Timezone Selector */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{ts("timezone")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select
                          value={pbxSettings.timezone}
                          onValueChange={(value) =>
                            setPbxSettings((prev) => ({ ...prev, timezone: value }))
                          }
                        >
                          <SelectTrigger className="w-full max-w-sm">
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
                      </CardContent>
                    </Card>

                    {/* Working Hours Grid */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{ts("workingHoursTab")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <WorkingHoursGrid
                          schedule={pbxSettings.working_hours}
                          onChange={(schedule) =>
                            setPbxSettings((prev) => ({ ...prev, working_hours: schedule }))
                          }
                        />
                      </CardContent>
                    </Card>

                    {/* After-Hours Action */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{ts("afterHoursAction")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Select
                          value={pbxSettings.after_hours_action}
                          onValueChange={(value: 'announcement' | 'voicemail' | 'forward') =>
                            setPbxSettings((prev) => ({ ...prev, after_hours_action: value }))
                          }
                        >
                          <SelectTrigger className="w-full max-w-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="announcement">{ts("playAnnouncement")}</SelectItem>
                            <SelectItem value="voicemail">{ts("voicemail")}</SelectItem>
                            <SelectItem value="forward">{ts("forwardCall")}</SelectItem>
                          </SelectContent>
                        </Select>

                        {pbxSettings.after_hours_action === 'forward' && (
                          <div className="space-y-2">
                            <Label>{ts("forwardNumber")}</Label>
                            <Input
                              type="tel"
                              placeholder="+1234567890"
                              className="max-w-sm"
                              value={pbxSettings.forward_number}
                              onChange={(e) =>
                                setPbxSettings((prev) => ({ ...prev, forward_number: e.target.value }))
                              }
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Holidays */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{ts("holidays")}</CardTitle>
                        <p className="text-sm text-muted-foreground">{ts("holidaysDescription")}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(pbxSettings.holidays || []).map((holiday, index) => (
                          <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <Input
                              type="date"
                              value={holiday.date}
                              onChange={(e) => {
                                const updated = [...pbxSettings.holidays];
                                updated[index] = { ...updated[index], date: e.target.value };
                                setPbxSettings((prev) => ({ ...prev, holidays: updated }));
                              }}
                              className="sm:w-44"
                            />
                            <Input
                              value={holiday.name}
                              placeholder={ts("holidayNamePlaceholder")}
                              onChange={(e) => {
                                const updated = [...pbxSettings.holidays];
                                updated[index] = { ...updated[index], name: e.target.value };
                                setPbxSettings((prev) => ({ ...prev, holidays: updated }));
                              }}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updated = pbxSettings.holidays.filter((_, i) => i !== index);
                                setPbxSettings((prev) => ({ ...prev, holidays: updated }));
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        {(!pbxSettings.holidays || pbxSettings.holidays.length === 0) && (
                          <p className="text-sm text-muted-foreground py-4 text-center">{ts("noHolidays")}</p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = [...(pbxSettings.holidays || []), { date: '', name: '' }];
                            setPbxSettings((prev) => ({ ...prev, holidays: updated }));
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {ts("addHoliday")}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button onClick={saveWorkingHours} disabled={pbxSaving}>
                        {pbxSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {ts("saving")}
                          </>
                        ) : (
                          ts("save")
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Tab 3: Sound Management ── */}
          <TabsContent value="sounds" className="space-y-6">
            {/* SIP Config Selector */}
            <Card>
              <CardHeader>
                <CardTitle>{ts("selectSipConfig")}</CardTitle>
              </CardHeader>
              <CardContent>
                {sipConfigs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{ts("noSipConfigs")}</p>
                ) : (
                  <Select
                    value={soundSipConfigId}
                    onValueChange={setSoundSipConfigId}
                  >
                    <SelectTrigger className="w-full max-w-sm">
                      <SelectValue placeholder={ts("selectSipConfig")} />
                    </SelectTrigger>
                    <SelectContent>
                      {sipConfigs.map((config) => (
                        <SelectItem key={config.id} value={String(config.id)}>
                          {config.name} {config.is_default ? "(Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {soundSipConfigId && (
              <>
                {soundLoading ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">{tCommon("loading")}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {SOUND_TYPES.map((sound) => (
                      <SoundCard
                        key={sound.key}
                        title={ts(sound.titleKey)}
                        description={ts(sound.descKey)}
                        soundUrl={soundSettings[sound.urlField as keyof PbxSettings] as string | null}
                        onUpload={(file) => uploadSound(soundSipConfigId, sound.key, file)}
                        onRemove={() => removeSound(soundSipConfigId, sound.key)}
                        uploading={uploadingSoundType === sound.key}
                      />
                    ))}

                    {/* Queue Position Announcements */}
                    <div className="col-span-full">
                      <h3 className="text-lg font-semibold mt-6 mb-2">{ts("queuePositionTitle")}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{ts("queuePositionDescription")}</p>
                    </div>

                    {QUEUE_POSITION_SOUND_TYPES.map((sound) => (
                      <SoundCard
                        key={sound.key}
                        title={ts(sound.titleKey)}
                        description={ts(sound.descKey)}
                        soundUrl={soundSettings[sound.urlField as keyof PbxSettings] as string | null}
                        onUpload={(file) => uploadSound(soundSipConfigId, sound.key, file)}
                        onRemove={() => removeSound(soundSipConfigId, sound.key)}
                        uploading={uploadingSoundType === sound.key}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGate>
  );
}
