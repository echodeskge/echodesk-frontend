"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  useSocialSyncStatus,
  useTriggerSocialSync,
  useUpdateSyncSettings,
  SyncStatusType,
  FacebookPageSyncStatus,
  InstagramAccountSyncStatus,
} from "@/hooks/api/useSocial";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Facebook,
  Instagram,
  RefreshCw,
  Check,
  Clock,
  AlertCircle,
  MessageSquare,
  Users,
  Settings,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface SocialSyncStatusProps {
  platform?: "facebook" | "instagram" | "all";
  compact?: boolean;
}

const syncStatusConfig: Record<SyncStatusType, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: <Clock className="h-3 w-3" />,
  },
  syncing: {
    label: "Syncing...",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  completed: {
    label: "Synced",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <Check className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

function SyncStatusBadge({ status }: { status: SyncStatusType }) {
  const config = syncStatusConfig[status];
  return (
    <Badge variant="outline" className={cn("flex items-center gap-1", config.color)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function formatSyncTime(timestamp: string | null): string {
  if (!timestamp) return "Never";
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

interface AccountSyncCardProps {
  platform: "facebook" | "instagram";
  accountId: string;
  accountName: string;
  syncStatus: SyncStatusType;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  syncDaysBack: number;
  conversationsSynced: number;
  messagesSynced: number;
  onSync: () => void;
  onUpdateSettings: (days: number) => void;
  isSyncing: boolean;
  isUpdating: boolean;
}

function AccountSyncCard({
  platform,
  accountId,
  accountName,
  syncStatus,
  lastSyncAt,
  lastSyncError,
  syncDaysBack,
  conversationsSynced,
  messagesSynced,
  onSync,
  onUpdateSettings,
  isSyncing,
  isUpdating,
}: AccountSyncCardProps) {
  const [showSettings, setShowSettings] = useState(false);

  const Icon = platform === "facebook" ? Facebook : Instagram;
  const iconBgClass = platform === "facebook"
    ? "bg-blue-600"
    : "bg-gradient-to-br from-purple-600 to-pink-600";

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg text-white", iconBgClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{accountName}</p>
            <p className="text-sm text-muted-foreground">ID: {accountId}</p>
          </div>
        </div>
        <SyncStatusBadge status={syncStatus} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>{conversationsSynced} conversations</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          <span>{messagesSynced} messages</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Last sync: {formatSyncTime(lastSyncAt)}</span>
        </div>
      </div>

      {/* Error message */}
      {syncStatus === "failed" && lastSyncError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {lastSyncError.length > 150 ? `${lastSyncError.slice(0, 150)}...` : lastSyncError}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onSync}
          disabled={isSyncing || syncStatus === "syncing"}
        >
          {isSyncing || syncStatus === "syncing" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="pt-3 border-t space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Sync history:</label>
            <Select
              value={String(syncDaysBack)}
              onValueChange={(value) => onUpdateSettings(Number(value))}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">365 days</SelectItem>
              </SelectContent>
            </Select>
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SocialSyncStatus({ platform = "all", compact = false }: SocialSyncStatusProps) {
  const { data: syncStatus, isLoading, refetch } = useSocialSyncStatus(platform === "all" ? undefined : platform);
  const triggerSync = useTriggerSocialSync();
  const updateSettings = useUpdateSyncSettings();
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());

  const handleSync = async (targetPlatform: "facebook" | "instagram", accountId?: string) => {
    const key = `${targetPlatform}_${accountId || "all"}`;
    setSyncingAccounts((prev) => new Set(prev).add(key));

    try {
      await triggerSync.mutateAsync({
        platform: targetPlatform,
        account_id: accountId,
        force: true,
      });
      refetch();
    } finally {
      setSyncingAccounts((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleUpdateSettings = async (targetPlatform: "facebook" | "instagram", accountId: string, days: number) => {
    await updateSettings.mutateAsync({
      platform: targetPlatform,
      account_id: accountId,
      sync_days_back: days,
    });
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const facebookPages = syncStatus?.facebook?.pages || [];
  const instagramAccounts = syncStatus?.instagram?.accounts || [];
  const hasFacebook = platform === "all" || platform === "facebook";
  const hasInstagram = platform === "all" || platform === "instagram";

  if (facebookPages.length === 0 && instagramAccounts.length === 0) {
    return null; // Don't show if no accounts connected
  }

  if (compact) {
    // Compact view for inline display
    return (
      <div className="flex items-center gap-4">
        {hasFacebook && facebookPages.length > 0 && (
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-blue-600" />
            <span className="text-sm">
              {facebookPages.filter((p) => p.sync_status === "completed").length}/{facebookPages.length} synced
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSync("facebook")}
              disabled={triggerSync.isPending}
            >
              <RefreshCw className={cn("h-4 w-4", triggerSync.isPending && "animate-spin")} />
            </Button>
          </div>
        )}
        {hasInstagram && instagramAccounts.length > 0 && (
          <div className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-pink-600" />
            <span className="text-sm">
              {instagramAccounts.filter((a) => a.sync_status === "completed").length}/{instagramAccounts.length} synced
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSync("instagram")}
              disabled={triggerSync.isPending}
            >
              <RefreshCw className={cn("h-4 w-4", triggerSync.isPending && "animate-spin")} />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Message History Sync
            </CardTitle>
            <CardDescription>
              Sync historical messages from your connected social accounts
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              if (hasFacebook) handleSync("facebook");
              if (hasInstagram) handleSync("instagram");
            }}
            disabled={triggerSync.isPending}
          >
            {triggerSync.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing All...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync All
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Facebook Pages */}
        {hasFacebook && facebookPages.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-600" />
              Facebook Pages
              <Badge variant="secondary" className="ml-2">
                {syncStatus?.facebook?.completed_count || 0}/{facebookPages.length} synced
              </Badge>
            </h4>
            <div className="space-y-2">
              {facebookPages.map((page) => (
                <AccountSyncCard
                  key={page.page_id}
                  platform="facebook"
                  accountId={page.page_id}
                  accountName={page.page_name}
                  syncStatus={page.sync_status}
                  lastSyncAt={page.last_sync_at}
                  lastSyncError={page.last_sync_error}
                  syncDaysBack={page.sync_days_back}
                  conversationsSynced={page.conversations_synced}
                  messagesSynced={page.messages_synced}
                  onSync={() => handleSync("facebook", page.page_id)}
                  onUpdateSettings={(days) => handleUpdateSettings("facebook", page.page_id, days)}
                  isSyncing={syncingAccounts.has(`facebook_${page.page_id}`)}
                  isUpdating={updateSettings.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {hasFacebook && hasInstagram && facebookPages.length > 0 && instagramAccounts.length > 0 && (
          <Separator />
        )}

        {/* Instagram Accounts */}
        {hasInstagram && instagramAccounts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pink-600" />
              Instagram Accounts
              <Badge variant="secondary" className="ml-2">
                {syncStatus?.instagram?.completed_count || 0}/{instagramAccounts.length} synced
              </Badge>
            </h4>
            <div className="space-y-2">
              {instagramAccounts.map((account) => (
                <AccountSyncCard
                  key={account.account_id}
                  platform="instagram"
                  accountId={account.account_id}
                  accountName={`@${account.username}`}
                  syncStatus={account.sync_status}
                  lastSyncAt={account.last_sync_at}
                  lastSyncError={account.last_sync_error}
                  syncDaysBack={account.sync_days_back}
                  conversationsSynced={account.conversations_synced}
                  messagesSynced={account.messages_synced}
                  onSync={() => handleSync("instagram", account.account_id)}
                  onUpdateSettings={(days) => handleUpdateSettings("instagram", account.account_id, days)}
                  isSyncing={syncingAccounts.has(`instagram_${account.account_id}`)}
                  isUpdating={updateSettings.isPending}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
