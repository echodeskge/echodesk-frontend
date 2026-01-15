"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AppearanceSettingsSkeleton } from "@/components/AppearanceSettingsSkeleton";
import { toast } from "sonner";
import { Sun, Moon, Monitor, GripVertical, RotateCcw, Check } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useDashboardAppearance, useUpdateDashboardAppearance, useResetDashboardAppearance } from "@/hooks/api";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { navigationConfig } from "@/config/navigationConfig";
import { cn } from "@/lib/utils";

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

// Preset theme colors
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

// Border radius options
const BORDER_RADIUS_OPTIONS = [
  { value: "0", label: "Sharp" },
  { value: "0.3rem", label: "Subtle" },
  { value: "0.5rem", label: "Default" },
  { value: "0.75rem", label: "Rounded" },
  { value: "1rem", label: "Pill" },
];

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
}

export default function AppearanceSettingsPage() {
  const t = useTranslations('settings.appearance');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');

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
    "social/messages": "messages",
    "email/messages": "emailMessages",
    users: "users",
    groups: "groups",
    social: "social",
    settings: "settings",
  };

  // Get top-level sidebar items for ordering
  const sidebarItems = useMemo(() => {
    return navigationConfig
      .filter(item => !item.id.includes('/')) // Only top-level items
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
      setFormData({
        primary_color: appearanceData.primary_color || "240 5.9% 10%",
        primary_color_dark: appearanceData.primary_color_dark || "0 0% 98%",
        secondary_color: appearanceData.secondary_color || "239 49% 32%",
        accent_color: appearanceData.accent_color || "240 4.8% 95.9%",
        sidebar_background: appearanceData.sidebar_background || "0 0% 100%",
        sidebar_primary: appearanceData.sidebar_primary || "240 5.9% 10%",
        border_radius: appearanceData.border_radius || "0.5rem",
        sidebar_order: appearanceData.sidebar_order || [],
      });

      // Update hex inputs
      setHexInputs({
        primary_color: hslToHex(appearanceData.primary_color || "240 5.9% 10%"),
        secondary_color: hslToHex(appearanceData.secondary_color || "239 49% 32%"),
        accent_color: hslToHex(appearanceData.accent_color || "240 4.8% 95.9%"),
        sidebar_background: hslToHex(appearanceData.sidebar_background || "0 0% 100%"),
      });
    }
  }, [appearanceData]);

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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Display Mode - Available to all users */}
      <Card>
        <CardHeader>
          <CardTitle>{t('modeTitle')}</CardTitle>
          <CardDescription>{t('modeDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={mode === 'light' ? 'default' : 'outline'}
              onClick={() => setMode('light')}
              className="flex items-center gap-2"
            >
              <Sun className="h-4 w-4" />
              {t('light')}
            </Button>
            <Button
              variant={mode === 'dark' ? 'default' : 'outline'}
              onClick={() => setMode('dark')}
              className="flex items-center gap-2"
            >
              <Moon className="h-4 w-4" />
              {t('dark')}
            </Button>
            <Button
              variant={mode === 'system' ? 'default' : 'outline'}
              onClick={() => setMode('system')}
              className="flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              {t('system')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Colors - Superadmin only */}
      {isSuperuser && (
        <Card>
          <CardHeader>
            <CardTitle>{t('themeTitle')}</CardTitle>
            <CardDescription>{t('themeDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset Colors */}
            <div>
              <Label className="mb-3 block">{t('presetColors')}</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_THEMES.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center",
                      formData.primary_color === preset.hsl
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-transparent hover:scale-110"
                    )}
                    style={{ backgroundColor: preset.hex }}
                    title={preset.name}
                  >
                    {formData.primary_color === preset.hsl && (
                      <Check className="h-5 w-5 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Color */}
              <div className="space-y-2">
                <Label>{t('primaryColor')}</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hexInputs.primary_color}
                    onChange={(e) => handleColorChange('primary_color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer border"
                  />
                  <Input
                    value={hexInputs.primary_color}
                    onChange={(e) => handleHexInputChange('primary_color', e.target.value)}
                    placeholder="#000000"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="space-y-2">
                <Label>{t('secondaryColor')}</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hexInputs.secondary_color}
                    onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer border"
                  />
                  <Input
                    value={hexInputs.secondary_color}
                    onChange={(e) => handleHexInputChange('secondary_color', e.target.value)}
                    placeholder="#000000"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label>{t('accentColor')}</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hexInputs.accent_color}
                    onChange={(e) => handleColorChange('accent_color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer border"
                  />
                  <Input
                    value={hexInputs.accent_color}
                    onChange={(e) => handleHexInputChange('accent_color', e.target.value)}
                    placeholder="#000000"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>

              {/* Sidebar Background */}
              <div className="space-y-2">
                <Label>{t('sidebarColor')}</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hexInputs.sidebar_background}
                    onChange={(e) => handleColorChange('sidebar_background', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer border"
                  />
                  <Input
                    value={hexInputs.sidebar_background}
                    onChange={(e) => handleHexInputChange('sidebar_background', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Border Radius - Superadmin only */}
      {isSuperuser && (
        <Card>
          <CardHeader>
            <CardTitle>{t('borderRadius')}</CardTitle>
            <CardDescription>{t('borderRadiusDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {BORDER_RADIUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={formData.border_radius === option.value ? 'default' : 'outline'}
                  onClick={() => handleBorderRadiusChange(option.value)}
                  style={{ borderRadius: option.value }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('preview')}</CardTitle>
          <CardDescription>{t('previewDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button>Primary Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <h4 className="font-semibold mb-2">Card Preview</h4>
              <p className="text-sm text-muted-foreground">
                This is how cards will look with the current theme settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sidebar Order - Superadmin only */}
      {isSuperuser && (
        <Card>
          <CardHeader>
            <CardTitle>{t('sidebarOrder')}</CardTitle>
            <CardDescription>{t('sidebarOrderDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sidebar-items">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {orderedSidebarItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
                              snapshot.isDragging && "shadow-lg bg-accent"
                            )}
                          >
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{item.label}</span>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons - Superadmin only */}
      {isSuperuser && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetAppearance.isPending}
          >
            {resetAppearance.isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {tCommon('loading')}
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('reset')}
              </>
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateAppearance.isPending}
          >
            {updateAppearance.isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {tCommon('saving')}
              </>
            ) : (
              tCommon('save')
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
