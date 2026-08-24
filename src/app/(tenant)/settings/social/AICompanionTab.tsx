"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bot, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useAICompanionSettings,
  useUpdateAICompanionSettings,
  type AICompanionChannel,
} from "@/hooks/api/useSocial";

/** Platforms the AI can answer on; each gets an enable switch (tenant-wide,
 *  account_id='' wildcard rows — per-account granularity comes later). */
const AI_PLATFORMS: AICompanionChannel["platform"][] = [
  "telegram", "facebook", "instagram", "whatsapp", "widget",
];

const LANGUAGES = [
  { value: "ka", label: "ქართული (Georgian)" },
  { value: "en", label: "English" },
  { value: "ru", label: "Русский (Russian)" },
];

/**
 * AI Companion settings tab (/settings/social). Self-contained: loads and
 * saves through its own endpoint (/api/social/ai/settings/) instead of the
 * page-wide social-settings PATCH, so it ships without touching the page's
 * save pipeline.
 */
export function AICompanionTab() {
  const t = useTranslations("social");
  const settingsQuery = useAICompanionSettings();
  const updateSettings = useUpdateAICompanionSettings();

  const [isEnabled, setIsEnabled] = useState(false);
  const [provider, setProvider] = useState<"anthropic" | "openai">("anthropic");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [language, setLanguage] = useState("ka");
  const [guidancePrompt, setGuidancePrompt] = useState("");
  const [escalationInstructions, setEscalationInstructions] = useState("");
  const [perConversationCap, setPerConversationCap] = useState(30);
  const [dailyCap, setDailyCap] = useState(500);
  const [enabledPlatforms, setEnabledPlatforms] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const data = settingsQuery.data;
    if (!data) return;
    setIsEnabled(data.is_enabled);
    setProvider(data.provider);
    setModel(data.model || "");
    setHasStoredKey(data.has_api_key);
    setLanguage(data.language || "ka");
    setGuidancePrompt(data.guidance_prompt || "");
    setEscalationInstructions(data.escalation_instructions || "");
    setPerConversationCap(data.max_replies_per_conversation_per_day);
    setDailyCap(data.max_replies_per_day);
    const platformMap: Record<string, boolean> = {};
    for (const channel of data.channels || []) {
      if (channel.account_id === "") platformMap[channel.platform] = channel.enabled;
    }
    setEnabledPlatforms(platformMap);
  }, [settingsQuery.data]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        is_enabled: isEnabled,
        provider,
        model,
        language,
        guidance_prompt: guidancePrompt,
        escalation_instructions: escalationInstructions,
        max_replies_per_conversation_per_day: perConversationCap,
        max_replies_per_day: dailyCap,
        // Only send the key when the admin typed one — leaving the field
        // blank keeps the stored key.
        ...(apiKey ? { api_key: apiKey } : {}),
        channels: AI_PLATFORMS.map((platform) => ({
          platform,
          account_id: "",
          enabled: !!enabledPlatforms[platform],
          guidance_prompt: "",
        })),
      });
      setApiKey("");
      toast.success(t("settingsPage.aiCompanion.saved"));
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || t("settingsPage.aiCompanion.saveError")
      );
    }
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t("settingsPage.aiCompanion.title")}
          </CardTitle>
          <CardDescription>
            {t("settingsPage.aiCompanion.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("settingsPage.aiCompanion.enabled")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settingsPage.aiCompanion.enabledHint")}
              </p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t("settingsPage.aiCompanion.guidancePrompt")}</Label>
            <Textarea
              value={guidancePrompt}
              onChange={(e) => setGuidancePrompt(e.target.value)}
              rows={6}
              placeholder={t("settingsPage.aiCompanion.guidancePromptPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("settingsPage.aiCompanion.guidancePromptHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t("settingsPage.aiCompanion.escalationInstructions")}</Label>
            <Textarea
              value={escalationInstructions}
              onChange={(e) => setEscalationInstructions(e.target.value)}
              rows={3}
              placeholder={t("settingsPage.aiCompanion.escalationPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("settingsPage.aiCompanion.escalationHint")}
            </p>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("settingsPage.aiCompanion.provider")}</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settingsPage.aiCompanion.model")}</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t("settingsPage.aiCompanion.modelPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("settingsPage.aiCompanion.apiKey")}</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                hasStoredKey
                  ? t("settingsPage.aiCompanion.apiKeySet")
                  : t("settingsPage.aiCompanion.apiKeyPlaceholder")
              }
            />
            <p className="text-xs text-muted-foreground">
              {t("settingsPage.aiCompanion.apiKeyHint")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("settingsPage.aiCompanion.language")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("settingsPage.aiCompanion.perConversationCap")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={perConversationCap}
                  onChange={(e) => setPerConversationCap(Number(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("settingsPage.aiCompanion.dailyCap")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={dailyCap}
                  onChange={(e) => setDailyCap(Number(e.target.value) || 1)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settingsPage.aiCompanion.channels")}</CardTitle>
          <CardDescription>
            {t("settingsPage.aiCompanion.channelsHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {AI_PLATFORMS.map((platform) => (
            <div key={platform} className="flex items-center justify-between">
              <Label className="capitalize">
                {t(`settingsPage.aiCompanion.platforms.${platform}`)}
              </Label>
              <Switch
                checked={!!enabledPlatforms[platform]}
                onCheckedChange={(checked) =>
                  setEnabledPlatforms((prev) => ({ ...prev, [platform]: checked }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t("settingsPage.aiCompanion.save")}
        </Button>
      </div>
    </div>
  );
}
