"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { rdButton } from "@/components/redesign/buttons";
import {
  FieldRow,
  SecretInput,
  SettingsSection,
  SettingsToggle,
  settingsFieldWidth,
  settingsInputClass,
} from "@/components/redesign/settings";
import { cn } from "@/lib/utils";
import { SectionBlock, StackLabel, selectTriggerClass, textareaClass } from "./_components/social-ui";
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
      <div className="flex justify-center py-10 text-muted-foreground" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <>
      <SettingsSection
        title={t("settingsPage.aiCompanion.title")}
        hint={t("settingsPage.aiCompanion.description")}
        testId="ai-companion-section"
      >
        <FieldRow
          label={t("settingsPage.aiCompanion.enabled")}
          help={t("settingsPage.aiCompanion.enabledHint")}
          htmlFor="ai-enabled"
          align="center"
        >
          <SettingsToggle id="ai-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
        </FieldRow>

        <SectionBlock>
          <StackLabel htmlFor="ai-guidance" label={t("settingsPage.aiCompanion.guidancePrompt")} />
          <Textarea
            id="ai-guidance"
            className={textareaClass}
            value={guidancePrompt}
            onChange={(e) => setGuidancePrompt(e.target.value)}
            rows={6}
            placeholder={t("settingsPage.aiCompanion.guidancePromptPlaceholder")}
          />
          <p className="text-xs leading-[17px] text-muted-foreground">
            {t("settingsPage.aiCompanion.guidancePromptHint")}
          </p>
        </SectionBlock>

        <SectionBlock>
          <StackLabel htmlFor="ai-escalation" label={t("settingsPage.aiCompanion.escalationInstructions")} />
          <Textarea
            id="ai-escalation"
            className={textareaClass}
            value={escalationInstructions}
            onChange={(e) => setEscalationInstructions(e.target.value)}
            rows={3}
            placeholder={t("settingsPage.aiCompanion.escalationPlaceholder")}
          />
          <p className="text-xs leading-[17px] text-muted-foreground">
            {t("settingsPage.aiCompanion.escalationHint")}
          </p>
        </SectionBlock>

        <FieldRow label={t("settingsPage.aiCompanion.provider")} align="center">
          <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
            <SelectTrigger className={cn(selectTriggerClass, settingsFieldWidth)} aria-label={t("settingsPage.aiCompanion.provider")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label={t("settingsPage.aiCompanion.model")} htmlFor="ai-model" align="center">
          <input
            id="ai-model"
            className={cn(settingsInputClass, settingsFieldWidth)}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={t("settingsPage.aiCompanion.modelPlaceholder")}
          />
        </FieldRow>

        <FieldRow label={t("settingsPage.aiCompanion.apiKey")} help={t("settingsPage.aiCompanion.apiKeyHint")} htmlFor="ai-api-key">
          <SecretInput
            id="ai-api-key"
            className={settingsFieldWidth}
            value={apiKey}
            onChange={setApiKey}
            autoComplete="new-password"
            placeholder={
              hasStoredKey
                ? t("settingsPage.aiCompanion.apiKeySet")
                : t("settingsPage.aiCompanion.apiKeyPlaceholder")
            }
            showLabel={t("settingsPage.aiCompanion.showKey")}
            hideLabel={t("settingsPage.aiCompanion.hideKey")}
            testId="ai-api-key"
          />
        </FieldRow>

        <FieldRow label={t("settingsPage.aiCompanion.language")} align="center">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className={cn(selectTriggerClass, settingsFieldWidth)} aria-label={t("settingsPage.aiCompanion.language")}>
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
        </FieldRow>

        <FieldRow label={t("settingsPage.aiCompanion.perConversationCap")} htmlFor="ai-per-conversation" align="center">
          <input
            id="ai-per-conversation"
            type="number"
            min={1}
            className={cn(settingsInputClass, "w-28 font-mono tabular-nums")}
            value={perConversationCap}
            onChange={(e) => setPerConversationCap(Number(e.target.value) || 1)}
          />
        </FieldRow>

        <FieldRow label={t("settingsPage.aiCompanion.dailyCap")} htmlFor="ai-daily" align="center">
          <input
            id="ai-daily"
            type="number"
            min={1}
            className={cn(settingsInputClass, "w-28 font-mono tabular-nums")}
            value={dailyCap}
            onChange={(e) => setDailyCap(Number(e.target.value) || 1)}
          />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title={t("settingsPage.aiCompanion.channels")}
        hint={t("settingsPage.aiCompanion.channelsHint")}
        testId="ai-companion-channels"
      >
        {AI_PLATFORMS.map((platform) => (
          <FieldRow
            key={platform}
            label={t(`settingsPage.aiCompanion.platforms.${platform}`)}
            htmlFor={`ai-platform-${platform}`}
            align="center"
          >
            <SettingsToggle
              id={`ai-platform-${platform}`}
              checked={!!enabledPlatforms[platform]}
              onCheckedChange={(checked) =>
                setEnabledPlatforms((prev) => ({ ...prev, [platform]: checked }))
              }
            />
          </FieldRow>
        ))}
      </SettingsSection>

      {/* The AI companion keeps its own Save (own endpoint). */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className={rdButton.primary}
          data-testid="ai-companion-save"
        >
          {updateSettings.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Save className="h-3.5 w-3.5" aria-hidden />
          )}
          {t("settingsPage.aiCompanion.save")}
        </button>
      </div>
    </>
  );
}
