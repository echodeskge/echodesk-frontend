"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { rdButton } from "@/components/redesign/buttons";
import {
  ActionButton,
  FactsGrid,
  FieldRow,
  SettingsNote,
  SettingsSection,
  settingsInputClass,
} from "@/components/redesign/settings";
import { cn } from "@/lib/utils";
import {
  Loader2,
  RefreshCw,
  FolderOpen,
  FolderX,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useEmailSyncDebug,
  useEmailSync,
  useUpdateEmailSyncSettings,
  EmailSyncFolderDebug,
} from "@/hooks/api/useSocial";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function FolderCard({ folder, isSkipped, t }: { folder: EmailSyncFolderDebug; isSkipped?: boolean; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex items-start justify-between rounded-lg border bg-card px-3 py-2.5 text-[13px]">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {isSkipped ? (
            <FolderX className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FolderOpen className="h-4 w-4 text-blue-500" />
          )}
          <span className="font-medium [overflow-wrap:anywhere]">{folder.name}</span>
          {isSkipped && (
            <Badge variant="secondary" className="text-xs">
              {t("settingsPage.emailSync.skipped")}
            </Badge>
          )}
        </div>
        {!isSkipped && (
          <div className="space-y-0.5 text-xs text-muted-foreground">
            {folder.total_messages_on_server !== undefined && (
              <p>{t("settingsPage.emailSync.serverMessages", { count: folder.total_messages_on_server })}</p>
            )}
            {folder.messages_matching_filter !== undefined && (
              <p>{t("settingsPage.emailSync.matchingFilter", { count: folder.messages_matching_filter })}</p>
            )}
            {folder.messages_already_synced !== undefined && (
              <p>{t("settingsPage.emailSync.alreadySynced", { count: folder.messages_already_synced })}</p>
            )}
            {folder.search_filter && (
              <p className="text-xs font-mono bg-muted px-1 rounded">
                {t("settingsPage.emailSync.filter")}: {folder.search_filter}
              </p>
            )}
          </div>
        )}
        {folder.skip_reason && (
          <p className="text-xs text-muted-foreground">{folder.skip_reason}</p>
        )}
        {folder.error && (
          <p className="text-xs text-destructive">{folder.error}</p>
        )}
      </div>
    </div>
  );
}

export function EmailSyncDebug({ connectionId }: { connectionId?: number }) {
  const t = useTranslations("social");
  const { toast } = useToast();
  const { data: debugInfo, isLoading, refetch, isRefetching } = useEmailSyncDebug(connectionId);
  const syncMutation = useEmailSync();
  const updateSettings = useUpdateEmailSyncSettings();

  const [syncDaysBack, setSyncDaysBack] = useState<string>("");

  const handleRefresh = () => {
    refetch();
  };

  const handleSync = () => {
    syncMutation.mutate(connectionId, {
      onSuccess: (data) => {
        toast({
          title: t("settingsPage.emailSync.syncCompleted"),
          description: t("settingsPage.emailSync.syncedMessages", { count: data.new_messages }),
        });
        refetch();
      },
      onError: (error: Error) => {
        toast({
          title: t("settingsPage.emailSync.syncFailed"),
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleUpdateSyncDays = () => {
    const days = parseInt(syncDaysBack, 10);
    if (isNaN(days) || days < 0) {
      toast({
        title: t("settingsPage.emailSync.invalidValue"),
        description: t("settingsPage.emailSync.invalidValueDescription"),
        variant: "destructive",
      });
      return;
    }

    updateSettings.mutate({ syncDaysBack: days, connectionId }, {
      onSuccess: (data) => {
        toast({
          title: t("settingsPage.emailSync.settingsUpdated"),
          description: t("settingsPage.emailSync.syncDaysSet", { meaning: data.meaning }),
        });
        setSyncDaysBack("");
        refetch();
      },
      onError: (error: Error) => {
        toast({
          title: t("settingsPage.emailSync.updateFailed"),
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <SettingsSection title={t("settingsPage.emailSync.title")} testId="email-sync-debug">
        <div className="flex items-center justify-center py-8" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      </SettingsSection>
    );
  }

  if (!debugInfo) {
    return (
      <SettingsSection title={t("settingsPage.emailSync.title")} testId="email-sync-debug">
        <p className="px-4 py-6 text-[13px] text-muted-foreground">{t("settingsPage.email.noConnections")}</p>
      </SettingsSection>
    );
  }

  return (
    <>
      <SettingsSection
        title={t("settingsPage.emailSync.title")}
        hint={t("settingsPage.emailSync.description")}
        testId="email-sync-debug"
        actions={
          <>
            <button
              type="button"
              className={rdButton.outlineSm}
              onClick={handleRefresh}
              disabled={isRefetching}
              aria-label={t("settingsPage.emailSync.refresh")}
              title={t("settingsPage.emailSync.refresh")}
            >
              <RefreshCw className={isRefetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} aria-hidden />
            </button>
            <button
              type="button"
              className={rdButton.primarySm}
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              )}
              {t("settingsPage.emailSync.syncNow")}
            </button>
          </>
        }
      >
        {/* Connection Info */}
        <FactsGrid
          items={[
            { k: t("settingsPage.emailSync.emailLabel"), v: <span className="[overflow-wrap:anywhere]">{debugInfo.connection.email}</span> },
            { k: t("settingsPage.emailSync.server"), v: <span className="[overflow-wrap:anywhere]">{debugInfo.connection.imap_server}</span> },
            {
              k: t("settingsPage.emailSync.syncRange"),
              v: (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  {debugInfo.connection.sync_days_back_meaning}
                </span>
              ),
            },
            {
              k: t("settingsPage.emailSync.lastSync"),
              v: debugInfo.connection.last_sync_at
                ? new Date(debugInfo.connection.last_sync_at).toLocaleString()
                : t("settingsPage.emailSync.never"),
            },
          ]}
        />
        {debugInfo.connection.last_sync_error && (
          <div className="border-b px-4 py-3">
            <SettingsNote tone="danger" icon={AlertCircle}>
              {debugInfo.connection.last_sync_error}
            </SettingsNote>
          </div>
        )}

        {/* Update Sync Days */}
        <FieldRow
          label={t("settingsPage.emailSync.daysToSync")}
          help={t("settingsPage.emailSync.syncHint", { current: debugInfo.connection.sync_days_back_meaning })}
          htmlFor="sync-days"
        >
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              id="sync-days"
              type="number"
              min="0"
              placeholder={String(debugInfo.connection.sync_days_back)}
              value={syncDaysBack}
              onChange={(e) => setSyncDaysBack(e.target.value)}
              className={cn(settingsInputClass, "w-full font-mono tabular-nums sm:w-28")}
            />
            <ActionButton
              onClick={handleUpdateSyncDays}
              disabled={!syncDaysBack || updateSettings.isPending}
              icon={updateSettings.isPending ? Loader2 : undefined}
            >
              {t("settingsPage.emailSync.update")}
            </ActionButton>
          </div>
        </FieldRow>
      </SettingsSection>

      {/* Summary */}
      <SettingsSection title={t("settingsPage.emailSync.summary")} testId="email-sync-summary">
        <FactsGrid
          items={[
            { k: t("settingsPage.emailSync.totalFolders"), v: <span className="text-lg tabular-nums">{debugInfo.summary.total_folders_on_server}</span> },
            { k: t("settingsPage.emailSync.syncing"), v: <span className="text-lg tabular-nums text-blue-600 dark:text-blue-400">{debugInfo.summary.folders_being_synced}</span> },
            { k: t("settingsPage.emailSync.skipped"), v: <span className="text-lg tabular-nums text-orange-600 dark:text-orange-400">{debugInfo.summary.folders_skipped}</span> },
            { k: t("settingsPage.emailSync.inDatabase"), v: <span className="text-lg tabular-nums text-green-600 dark:text-green-400">{debugInfo.summary.total_messages_in_db}</span> },
          ]}
        />

        {/* Folders */}
        <Accordion type="multiple" className="w-full px-4" data-testid="email-sync-folders">
          <AccordionItem value="synced-folders">
            <AccordionTrigger className="text-[13px]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden />
                {t("settingsPage.emailSync.syncedFolders", { count: debugInfo.folders.length })}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-1">
                {debugInfo.folders.map((folder) => (
                  <FolderCard key={folder.name} folder={folder} t={t} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="skipped-folders" className="border-b-0">
            <AccordionTrigger className="text-[13px]">
              <div className="flex items-center gap-2">
                <FolderX className="h-4 w-4 text-muted-foreground" aria-hidden />
                {t("settingsPage.emailSync.skippedFolders", { count: debugInfo.skipped_folders.length })}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-1">
                {debugInfo.skipped_folders.map((folder) => (
                  <FolderCard key={folder.name} folder={folder} isSkipped t={t} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SettingsSection>

      {/* Errors */}
      {debugInfo.errors.length > 0 && (
        <SettingsNote tone="danger" icon={AlertCircle} testId="email-sync-errors">
          <p className="font-semibold">{t("settingsPage.emailSync.errors")}</p>
          <ul className="mt-1 space-y-0.5">
            {debugInfo.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </SettingsNote>
      )}
    </>
  );
}
