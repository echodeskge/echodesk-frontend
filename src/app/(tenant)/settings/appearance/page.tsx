"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AppearanceSettingsSkeleton } from "@/components/AppearanceSettingsSkeleton";
import { toast } from "sonner";
import { Sun, Moon, Monitor, GripVertical, Palette } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useDashboardAppearance, useUpdateDashboardAppearance, useResetDashboardAppearance } from "@/hooks/api";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { navigationConfig } from "@/config/navigationConfig";
import { cn } from "@/lib/utils";
import {
  ChoiceControl,
  DangerZone,
  FieldRow,
  SettingsFormPage,
  SettingsSection,
  StickySaveBar,
  SwatchPicker,
  settingsInputClass,
} from "@/components/redesign/settings";
import { useSettingsSaveBarLabels } from "../_lib/settings-ui-labels";

// HSL to Hex conversion
function hslToHex(hsl: string): string {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return "#000000";

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Hex to HSL conversion
function hexToHsl(hex: string): string {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map(c => c + c).join("");
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }

  return `${Math.round(h)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

// Preset theme colors (name lower-cased = key under settings.appearance.presets)
const PRESET_THEMES = [
  { name: "Zinc", hsl: "240 5.9% 10%", hex: "#18181b" },
  { name: "Slate", hsl: "215.4 16.3% 46.9%", hex: "#64748b" },
  { name: "Blue", hsl: "221.2 83.2% 53.3%", hex: "#3b82f6" },
  { name: "Green", hsl: "142.1 76.2% 36.3%", hex: "#16a34a" },
  { name: "Orange", hsl: "24.6 95% 53.1%", hex: "#f97316" },
  { name: "Rose", hsl: "346.8 77.2% 49.8%", hex: "#e11d48" },
  { name: "Violet", hsl: "262.1 83.3% 57.8%", hex: "#8b5cf6" },
  { name: "Red", hsl: "0 72.2% 50.6%", hex: "#dc2626" },
];

// Border radius options (label = key under settings.appearance.radius)
const BORDER_RADIUS_OPTIONS = [
  { value: "0", label: "sharp" },
  { value: "0.3rem", label: "subtle" },
  { value: "0.5rem", label: "default" },
  { value: "0.75rem", label: "rounded" },
  { value: "1rem", label: "pill" },
];

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
}

type AppearanceForm = {
  primary_color: string;
  primary_color_dark: string;
  secondary_color: string;
  accent_color: string;
  sidebar_background: string;
  sidebar_primary: string;
  border_radius: string;
  sidebar_order: string[];
};
type HexInputs = Record<"primary_color" | "secondary_color" | "accent_color" | "sidebar_background", string>;

// The form values for loaded appearance data (same defaults as before), used
// to initialise the form, to tell whether it changed and for Discard.
function formFromAppearance(appearanceData: any): AppearanceForm {
  return {
    primary_color: appearanceData?.primary_color || "240 5.9% 10%",
    primary_color_dark: appearanceData?.primary_color_dark || "0 0% 98%",
    secondary_color: appearanceData?.secondary_color || "239 49% 32%",
    accent_color: appearanceData?.accent_color || "240 4.8% 95.9%",
    sidebar_background: appearanceData?.sidebar_background || "0 0% 100%",
    sidebar_primary: appearanceData?.sidebar_primary || "240 5.9% 10%",
    border_radius: appearanceData?.border_radius || "0.5rem",
    sidebar_order: appearanceData?.sidebar_order || [],
  };
}

function hexFromAppearance(appearanceData: any): HexInputs {
  return {
    primary_color: hslToHex(appearanceData?.primary_color || "240 5.9% 10%"),
    secondary_color: hslToHex(appearanceData?.secondary_color || "239 49% 32%"),
    accent_color: hslToHex(appearanceData?.accent_color || "240 4.8% 95.9%"),
    sidebar_background: hslToHex(appearanceData?.sidebar_background || "0 0% 100%"),
  };
}

export default function AppearanceSettingsPage() {
  const t = useTranslations('settings.appearance');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const tSettings = useTranslations('settings');
  const saveBarLabels = useSettingsSaveBarLabels();

  const { mode, setMode, resolvedMode, setAppearance: setThemeAppearance } = useTheme();
  const { data: userProfile } = useUserProfile();
  const { data: appearanceData, isLoading } = useDashboardAppearance();
  const updateAppearance = useUpdateDashboardAppearance();
  const resetAppearance = useResetDashboardAppearance();

  const isSuperuser = Boolean((userProfile as any)?.is_superuser);

  // Local state for form
  const [formData, setFormData] = useState({
    primary_color: "240 5.9% 10%",
    primary_color_dark: "0 0% 98%",
    secondary_color: "239 49% 32%",
    accent_color: "240 4.8% 95.9%",
    sidebar_background: "0 0% 100%",
    sidebar_primary: "240 5.9% 10%",
    border_radius: "0.5rem",
    sidebar_order: [] as string[],
  });

  // Hex input state (for manual hex entry)
  const [hexInputs, setHexInputs] = useState({
    primary_color: "",
    secondary_color: "",
    accent_color: "",
    sidebar_background: "",
  });

  // Translation key mapping for sidebar items
  const translationKeyMap: Record<string, string> = {
    tickets: "tickets",
    "time-tracking": "timeTracking",
    "user-statistics": "userStatistics",
    calls: "calls",
    ecommerce: "ecommerce",
    bookings: "bookings",
    leave: "leave",
    invoices: "invoices",
    "invoices/invoices": "invoicesManagement",
    "social/messages": "messages",
    "social/clients": "socialClients",
    "social/templates": "socialTemplates",
    email: "email",
    users: "users",
    groups: "groups",
    social: "social",
    settings: "settings",
    "report-bug": "reportBug",
    help: "help",
  };

  // Get top-level sidebar items for ordering
  const sidebarItems = useMemo(() => {
    return navigationConfig
      // Every navigationConfig entry is a top-level sidebar item (children are
      // nested), including ids with a slash such as "social/messages".
      // "preferences" is the fallback entry for users WITHOUT settings access;
      // anyone on this page has it, so listing it just duplicates "Settings".
      .filter(item => item.excludeFeatureKey !== 'settings')
      // Settings, Help and Report a bug are pinned to the sidebar footer.
      .filter(item => !['settings', 'help', 'report-bug'].includes(item.id))
      .map(item => ({
        id: item.id,
        label: tNav(translationKeyMap[item.id] || item.id),
        icon: item.icon,
      }));
  }, [tNav]);

  // Ordered sidebar items based on formData.sidebar_order
  const orderedSidebarItems = useMemo(() => {
    if (!formData.sidebar_order?.length) return sidebarItems;

    const orderMap = new Map(formData.sidebar_order.map((id, idx) => [id, idx]));
    return [...sidebarItems].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? 999;
      const orderB = orderMap.get(b.id) ?? 999;
      return orderA - orderB;
    });
  }, [sidebarItems, formData.sidebar_order]);

  // Initialize form data when appearance data loads
  useEffect(() => {
    if (appearanceData) {
      setFormData(formFromAppearance(appearanceData));

      // Update hex inputs
      setHexInputs(hexFromAppearance(appearanceData));
    }
  }, [appearanceData]);

  // Explicit save (sticky save bar): dirty = differs from the loaded values;
  // Discard restores them (and with them the live preview).
  const loadedForm = useMemo(() => formFromAppearance(appearanceData), [appearanceData]);
  const isDirty = JSON.stringify(formData) !== JSON.stringify(loadedForm);
  const handleDiscard = () => {
    setFormData(formFromAppearance(appearanceData));
    setHexInputs(appearanceData ? hexFromAppearance(appearanceData) : { primary_color: "", secondary_color: "", accent_color: "", sidebar_background: "" });
  };

  // Update theme context when form data changes (live preview)
  useEffect(() => {
    setThemeAppearance(formData as any);
  }, [formData, setThemeAppearance]);

  const handleColorChange = (field: keyof typeof formData, hex: string) => {
    const hsl = hexToHsl(hex);
    setFormData(prev => ({ ...prev, [field]: hsl }));
    setHexInputs(prev => ({ ...prev, [field]: hex }));
  };

  const handleHexInputChange = (field: keyof typeof hexInputs, value: string) => {
    setHexInputs(prev => ({ ...prev, [field]: value }));

    // Validate and convert hex
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const hsl = hexToHsl(value);
      setFormData(prev => ({ ...prev, [field]: hsl }));
    }
  };

  const handlePresetClick = (preset: typeof PRESET_THEMES[0]) => {
    setFormData(prev => ({ ...prev, primary_color: preset.hsl }));
    setHexInputs(prev => ({ ...prev, primary_color: preset.hex }));
  };

  const handleBorderRadiusChange = (value: string) => {
    setFormData(prev => ({ ...prev, border_radius: value }));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(orderedSidebarItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData(prev => ({
      ...prev,
      sidebar_order: items.map(item => item.id),
    }));
  };

  const handleSave = async () => {
    try {
      await updateAppearance.mutateAsync(formData);
      toast.success(t('saveSuccess'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('saveError'));
    }
  };

  const handleReset = async () => {
    try {
      await resetAppearance.mutateAsync();
      toast.success(t('resetSuccess'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('resetError'));
    }
  };

  if (isLoading) {
    return <AppearanceSettingsSkeleton />;
  }

  const colorRows: { field: keyof HexInputs; label: string; placeholder: string }[] = [
    { field: "primary_color", label: t('primaryColor'), placeholder: "#000000" },
    { field: "secondary_color", label: t('secondaryColor'), placeholder: "#000000" },
    { field: "accent_color", label: t('accentColor'), placeholder: "#000000" },
    { field: "sidebar_background", label: t('sidebarColor'), placeholder: "#ffffff" },
  ];
  const activePreset = PRESET_THEMES.find((p) => p.hsl === formData.primary_color)?.name ?? null;

  return (
    <SettingsFormPage
      icon={Palette}
      title={tSettings('nav.appearance')}
      description={tSettings('navDesc.appearance')}
      testId="settings-appearance"
    >
      {/* Display Mode - Available to all users (saved locally, instantly) */}
      <SettingsSection title={t('sections.display')} testId="appearance-mode">
        <FieldRow label={t('modeTitle')} help={t('modeDescription')} align="center">
          <ChoiceControl<"light" | "dark" | "system">
            value={mode}
            onChange={(m) => setMode(m)}
            options={[
              { value: "light", label: t('light'), icon: Sun },
              { value: "dark", label: t('dark'), icon: Moon },
              { value: "system", label: t('system'), icon: Monitor },
            ]}
            ariaLabel={t('modeTitle')}
            testId="appearance-mode-choice"
          />
        </FieldRow>
      </SettingsSection>

      {/* Theme Colors + Border Radius - Superadmin only */}
      {isSuperuser && (
        <SettingsSection title={t('themeTitle')} hint={t('themeDescription')} testId="appearance-theme">
          <FieldRow label={t('presetColors')} align="center">
            <SwatchPicker
              value={activePreset}
              onChange={(name) => {
                const preset = PRESET_THEMES.find((p) => p.name === name);
                if (preset) handlePresetClick(preset);
              }}
              options={PRESET_THEMES.map((preset) => ({
                value: preset.name,
                label: t(`presets.${preset.name.toLowerCase()}`),
                color: preset.hex,
              }))}
              ariaLabel={t('presetColors')}
              testId="appearance-presets"
            />
          </FieldRow>
          {colorRows.map(({ field, label, placeholder }) => (
            <FieldRow key={field} label={label} htmlFor={`appearance-${field}`} align="center">
              <div className="flex w-full items-center gap-2 sm:w-[200px]">
                <input
                  type="color"
                  value={hexInputs[field]}
                  onChange={(e) => handleColorChange(field, e.target.value)}
                  aria-label={label}
                  className="h-[34px] w-[38px] shrink-0 cursor-pointer rounded-md border bg-background p-0.5"
                />
                <input
                  id={`appearance-${field}`}
                  value={hexInputs[field]}
                  onChange={(e) => handleHexInputChange(field, e.target.value)}
                  placeholder={placeholder}
                  className={cn(settingsInputClass, "flex-1 font-mono")}
                />
              </div>
            </FieldRow>
          ))}
          <FieldRow label={t('borderRadius')} help={t('borderRadiusDescription')}>
            <ChoiceControl
              value={formData.border_radius}
              onChange={handleBorderRadiusChange}
              options={BORDER_RADIUS_OPTIONS.map((option) => ({
                value: option.value,
                label: t(`radius.${option.label}`),
              }))}
              ariaLabel={t('borderRadius')}
              testId="appearance-radius"
            />
          </FieldRow>
        </SettingsSection>
      )}

      {/* Preview Section */}
      <SettingsSection title={t('preview')} hint={t('previewDescription')} testId="appearance-preview">
        <div className="flex flex-col gap-3 px-4 py-3.5">
          <div className="flex flex-wrap gap-2">
            <Button size="sm">{t('previewPrimary')}</Button>
            <Button size="sm" variant="secondary">{t('previewSecondary')}</Button>
            <Button size="sm" variant="outline">{t('previewOutline')}</Button>
            <Button size="sm" variant="destructive">{t('previewDestructive')}</Button>
          </div>
          <div className="rounded-lg border bg-card p-3.5">
            <h4 className="mb-1 text-[13px] font-semibold">{t('previewCardTitle')}</h4>
            <p className="text-xs text-muted-foreground">{t('previewCardText')}</p>
          </div>
        </div>
      </SettingsSection>

      {/* Sidebar Order - Superadmin only */}
      {isSuperuser && (
        <SettingsSection title={t('sidebarOrder')} hint={t('sidebarOrderDescription')} testId="appearance-sidebar-order">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sidebar-items">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex flex-col gap-1.5 p-3"
                >
                  {orderedSidebarItems.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={cn(
                            "flex min-h-9 items-center gap-2.5 rounded-md border bg-background px-2.5 text-[13px] transition-colors",
                            snapshot.isDragging && "bg-accent shadow-lg"
                          )}
                        >
                          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <span className="min-w-0 truncate font-medium">{item.label}</span>
                          <span className="ms-auto text-[11px] tabular-nums text-muted-foreground">{index + 1}</span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </SettingsSection>
      )}

      {/* Reset + Save - Superadmin only (Reset runs at once, as before) */}
      {isSuperuser && (
        <DangerZone
          label={t('resetTitle')}
          help={t('resetHelp')}
          actionLabel={resetAppearance.isPending ? tCommon('loading') : t('reset')}
          onAction={handleReset}
          disabled={resetAppearance.isPending}
          testId="appearance-reset"
        />
      )}
      {isSuperuser && (
        <StickySaveBar
          dirty={isDirty}
          saving={updateAppearance.isPending}
          onSave={handleSave}
          onDiscard={handleDiscard}
          labels={saveBarLabels}
        />
      )}
    </SettingsFormPage>
  );
}
