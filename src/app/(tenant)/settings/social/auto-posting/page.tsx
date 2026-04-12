"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sparkles, Save, Loader2, Facebook, Instagram,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ka", label: "Georgian" },
];
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
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <PublishingStatusBanner />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="settings">{t("settingsTab")}</TabsTrigger>
          <TabsTrigger value="queue">{t("queueTab")}</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t("generalSettings")}
                <div className="flex items-center gap-2">
                  <Label htmlFor="is_enabled" className="text-sm font-normal">
                    {mergedSettings.is_enabled ? t("enabled") : t("disabled")}
                  </Label>
                  <Switch
                    id="is_enabled"
                    checked={mergedSettings.is_enabled ?? false}
                    onCheckedChange={v => handleSettingsChange("is_enabled", v)}
                  />
                </div>
              </CardTitle>
              <CardDescription>{t("generalSettingsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Description */}
              <div className="space-y-2">
                <Label>{t("companyDescription")}</Label>
                <Textarea
                  placeholder={t("companyDescriptionPlaceholder")}
                  value={mergedSettings.company_description ?? ""}
                  onChange={e => handleSettingsChange("company_description", e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">{t("companyDescriptionHelp")}</p>
              </div>

              {/* Platforms */}
              <div className="space-y-3">
                <Label>{t("platforms")}</Label>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mergedSettings.post_to_facebook ?? true}
                      onCheckedChange={v => handleSettingsChange("post_to_facebook", v)}
                    />
                    <Facebook className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Facebook</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mergedSettings.post_to_instagram ?? true}
                      onCheckedChange={v => handleSettingsChange("post_to_instagram", v)}
                    />
                    <Instagram className="h-4 w-4 text-pink-600" />
                    <span className="text-sm">Instagram</span>
                  </div>
                </div>
              </div>

              {/* Posting Time & Timezone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>{t("postingTime")}</Label>
                  <Input
                    type="time"
                    value={mergedSettings.posting_time ?? "10:00"}
                    onChange={e => handleSettingsChange("posting_time", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("timezone")}</Label>
                  <Select
                    value={mergedSettings.timezone ?? "UTC"}
                    onValueChange={v => handleSettingsChange("timezone", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tone & Content Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>{t("tone")}</Label>
                  <Select
                    value={mergedSettings.tone ?? "professional"}
                    onValueChange={v => handleSettingsChange("tone", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map(tone => (
                        <SelectItem key={tone} value={tone}>{t(`tones.${tone}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("contentSource")}</Label>
                  <Select
                    value={mergedSettings.content_source ?? "both"}
                    onValueChange={v => handleSettingsChange("content_source", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map(src => (
                        <SelectItem key={src} value={src}>{t(`sources.${src}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Language & Max Posts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>{t("contentLanguage")}</Label>
                  <Select
                    value={mergedSettings.content_language ?? "en"}
                    onValueChange={v => handleSettingsChange("content_language", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("maxPostsPerDay")}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={mergedSettings.max_posts_per_day ?? 1}
                    onChange={e => handleSettingsChange("max_posts_per_day", parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              {/* Require Approval */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-sm">{t("requireApproval")}</p>
                  <p className="text-xs text-muted-foreground">{t("requireApprovalHelp")}</p>
                </div>
                <Switch
                  checked={mergedSettings.require_approval ?? true}
                  onCheckedChange={v => handleSettingsChange("require_approval", v)}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSaveSettings} disabled={updateSettings.isPending || Object.keys(formData).length === 0}>
                  {updateSettings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {tCommon("save")}
                </Button>
                <Button variant="outline" onClick={handleGenerate} disabled={generatePost.isPending}>
                  {generatePost.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {t("generateNow")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {["", "draft", "approved", "published", "failed", "rejected"].map(status => (
                <Badge
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter(status)}
                >
                  {status ? t(`status.${status}`) : t("allStatuses")}
                </Badge>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generatePost.isPending}>
              {generatePost.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {t("generateNow")}
            </Button>
          </div>

          {postsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : posts?.results && posts.results.length > 0 ? (
            <div className="space-y-3">
              {posts.results.map(post => (
                <AutoPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("noPosts")}</p>
                <p className="text-sm mt-1">{t("noPostsHelp")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
