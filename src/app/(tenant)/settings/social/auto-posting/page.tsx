"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2, Facebook, Instagram } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/redesign/segmented";
import { EmptyBlock } from "@/components/redesign/states";
import { rdButton } from "@/components/redesign/buttons";
import {
  FieldRow,
  SettingsFormPage,
  SettingsSection,
  SettingsToggle,
  StickySaveBar,
  settingsFieldWidth,
  settingsInputClass,
} from "@/components/redesign/settings";
import { cn } from "@/lib/utils";
import { SectionBlock, StackLabel, selectTriggerClass, textareaClass } from "@/components/social/settings-blocks";
import { toast } from "sonner";
import {
  useAutoPostSettings,
  useUpdateAutoPostSettings,
  useAutoPostList,
  useGeneratePost,
} from "@/hooks/api/useAutoPost";
import { PublishingStatusBanner } from "@/components/social/PublishingStatusBanner";
import { AutoPostCard } from "@/components/social/AutoPostCard";

const TONE_OPTIONS = ["professional", "casual", "friendly", "promotional", "informative"];
const SOURCE_OPTIONS = ["products", "company", "both"];
const LANGUAGE_OPTIONS = ["en", "ka"] as const;
const TIMEZONE_OPTIONS = [
  "UTC", "Asia/Tbilisi", "Europe/London", "Europe/Berlin",
  "America/New_York", "America/Los_Angeles", "Asia/Tokyo",
];

export default function AutoPostingPage() {
  const t = useTranslations("autoPosting");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState("settings");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: settings, isLoading: settingsLoading } = useAutoPostSettings();
  const updateSettings = useUpdateAutoPostSettings();
  const { data: posts, isLoading: postsLoading } = useAutoPostList({ status: statusFilter || undefined });
  const generatePost = useGeneratePost();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const mergedSettings = { ...settings, ...formData };

  const handleSettingsChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      setFormData({});
      toast.success(t("settingsSaved"));
    } catch {
      toast.error(t("settingsError"));
    }
  };

  const handleGenerate = async () => {
    try {
      await generatePost.mutateAsync();
      toast.success(t("postGenerated"));
      setActiveTab("queue");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t("generateError"));
    }
  };

  if (settingsLoading) {
    return (
      <div className="w-full space-y-4 p-4 sm:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full max-w-[720px]" />
      </div>
    );
  }

  const generateButton = (
    <button type="button" className={rdButton.outline} onClick={handleGenerate} disabled={generatePost.isPending} data-testid="auto-post-generate">
      {generatePost.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
      {t("generateNow")}
    </button>
  );

  return (
    <SettingsFormPage
      icon={Sparkles}
      title={t("title")}
      description={t("subtitle")}
      action={generateButton}
      testId="auto-posting-page"
    >
      <PublishingStatusBanner />

      <Segmented
        value={activeTab as "settings" | "queue"}
        onChange={setActiveTab}
        ariaLabel={t("title")}
        className="self-start"
        testId="auto-posting-tabs"
        options={[
          { value: "settings", label: t("settingsTab") },
          { value: "queue", label: t("queueTab") },
        ]}
      />

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <SettingsSection
          title={t("generalSettings")}
          hint={t("generalSettingsDescription")}
          testId="auto-posting-settings"
          actions={
            <label htmlFor="is_enabled" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              {mergedSettings.is_enabled ? t("enabled") : t("disabled")}
              <SettingsToggle
                id="is_enabled"
                checked={mergedSettings.is_enabled ?? false}
                onCheckedChange={v => handleSettingsChange("is_enabled", v)}
              />
            </label>
          }
        >
          {/* Company Description */}
          <SectionBlock>
            <StackLabel htmlFor="company_description" label={t("companyDescription")} help={t("companyDescriptionHelp")} />
            <Textarea
              id="company_description"
              className={textareaClass}
              placeholder={t("companyDescriptionPlaceholder")}
              value={mergedSettings.company_description ?? ""}
              onChange={e => handleSettingsChange("company_description", e.target.value)}
              rows={3}
            />
          </SectionBlock>

          {/* Platforms */}
          <FieldRow label={t("platforms")} align="center">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label className="inline-flex items-center gap-2 text-[13px]">
                <SettingsToggle
                  checked={mergedSettings.post_to_facebook ?? true}
                  onCheckedChange={v => handleSettingsChange("post_to_facebook", v)}
                  aria-label="Facebook"
                />
                <Facebook className="h-4 w-4 text-blue-600" aria-hidden />
                Facebook
              </label>
              <label className="inline-flex items-center gap-2 text-[13px]">
                <SettingsToggle
                  checked={mergedSettings.post_to_instagram ?? true}
                  onCheckedChange={v => handleSettingsChange("post_to_instagram", v)}
                  aria-label="Instagram"
                />
                <Instagram className="h-4 w-4 text-pink-600" aria-hidden />
                Instagram
              </label>
            </div>
          </FieldRow>

          {/* Posting Time & Timezone */}
          <FieldRow label={t("postingTime")} htmlFor="posting_time" align="center">
            <input
              id="posting_time"
              type="time"
              className={cn(settingsInputClass, "w-36 font-mono tabular-nums")}
              value={mergedSettings.posting_time ?? "10:00"}
              onChange={e => handleSettingsChange("posting_time", e.target.value)}
            />
          </FieldRow>
          <FieldRow label={t("timezone")} align="center">
            <Select
              value={mergedSettings.timezone ?? "UTC"}
              onValueChange={v => handleSettingsChange("timezone", v)}
            >
              <SelectTrigger className={cn(selectTriggerClass, settingsFieldWidth)} aria-label={t("timezone")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Tone & Content Source */}
          <FieldRow label={t("tone")} align="center">
            <Select
              value={mergedSettings.tone ?? "professional"}
              onValueChange={v => handleSettingsChange("tone", v)}
            >
              <SelectTrigger className={cn(selectTriggerClass, settingsFieldWidth)} aria-label={t("tone")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map(tone => (
                  <SelectItem key={tone} value={tone}>{t(`tones.${tone}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label={t("contentSource")} align="center">
            <Select
              value={mergedSettings.content_source ?? "both"}
              onValueChange={v => handleSettingsChange("content_source", v)}
            >
              <SelectTrigger className={cn(selectTriggerClass, settingsFieldWidth)} aria-label={t("contentSource")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map(src => (
                  <SelectItem key={src} value={src}>{t(`sources.${src}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Language & Max Posts */}
          <FieldRow label={t("contentLanguage")} align="center">
            <Select
              value={mergedSettings.content_language ?? "en"}
              onValueChange={v => handleSettingsChange("content_language", v)}
            >
              <SelectTrigger className={cn(selectTriggerClass, settingsFieldWidth)} aria-label={t("contentLanguage")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map(lang => (
                  <SelectItem key={lang} value={lang}>{t(`languages.${lang}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label={t("maxPostsPerDay")} htmlFor="max_posts_per_day" align="center">
            <input
              id="max_posts_per_day"
              type="number"
              min={1}
              max={10}
              className={cn(settingsInputClass, "w-24 font-mono tabular-nums")}
              value={mergedSettings.max_posts_per_day ?? 1}
              onChange={e => handleSettingsChange("max_posts_per_day", parseInt(e.target.value) || 1)}
            />
          </FieldRow>

          {/* Require Approval */}
          <FieldRow label={t("requireApproval")} help={t("requireApprovalHelp")} htmlFor="require_approval" align="center">
            <SettingsToggle
              id="require_approval"
              checked={mergedSettings.require_approval ?? true}
              onCheckedChange={v => handleSettingsChange("require_approval", v)}
            />
          </FieldRow>
        </SettingsSection>
      )}

      {/* Queue Tab */}
      {activeTab === "queue" && (
        <div className="flex min-w-0 flex-col gap-3" data-testid="auto-posting-queue">
          <Segmented
            value={statusFilter || "all"}
            onChange={(v) => setStatusFilter(v === "all" ? "" : v)}
            ariaLabel={t("queueTab")}
            testId="auto-posting-status-filter"
            options={["", "draft", "approved", "published", "failed", "rejected"].map((status) => ({
              value: status || "all",
              label: status ? t(`status.${status}`) : t("allStatuses"),
            }))}
          />

          {postsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-[10px]" />)}
            </div>
          ) : posts?.results && posts.results.length > 0 ? (
            <div className="overflow-hidden rounded-[10px] border bg-card">
              {posts.results.map(post => (
                <AutoPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="rounded-[10px] border bg-card">
              <EmptyBlock icon={Sparkles} title={t("noPosts")} description={t("noPostsHelp")} />
            </div>
          )}
        </div>
      )}

      {/* The page's Save (enabled only with changes, as before) in the design save bar. */}
      <StickySaveBar
        dirty={Object.keys(formData).length > 0}
        saving={updateSettings.isPending}
        onSave={handleSaveSettings}
        onDiscard={() => setFormData({})}
        saveDisabled={updateSettings.isPending || Object.keys(formData).length === 0}
        labels={{
          unsaved: t("saveBar.unsaved"),
          discard: t("saveBar.discard"),
          save: tCommon("save"),
          saving: tCommon("saving"),
        }}
      />
    </SettingsFormPage>
  );
}
