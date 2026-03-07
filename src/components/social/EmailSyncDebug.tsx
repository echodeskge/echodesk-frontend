"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Loader2,
  RefreshCw,
  FolderOpen,
  FolderX,
  Database,
  Clock,
  AlertCircle,
  CheckCircle2,
  Settings,
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
    <div className="flex items-start justify-between p-3 rounded-lg border bg-card">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {isSkipped ? (
            <FolderX className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FolderOpen className="h-4 w-4 text-blue-500" />
          )}
          <span className="font-medium">{folder.name}</span>
          {isSkipped && (
            <Badge variant="secondary" className="text-xs">
              {t("settingsPage.emailSync.skipped")}
            </Badge>
          )}
        </div>
        {!isSkipped && (
          <div className="text-sm text-muted-foreground space-y-0.5">
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
          <p className="text-sm text-muted-foreground">{folder.skip_reason}</p>
        )}
        {folder.error && (
          <p className="text-sm text-destructive">{folder.error}</p>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("settingsPage.emailSync.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!debugInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("settingsPage.emailSync.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("settingsPage.email.noConnections")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("settingsPage.emailSync.title")}
            </CardTitle>
            <CardDescription>
              {t("settingsPage.emailSync.description")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {t("settingsPage.emailSync.syncNow")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Info */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t("settingsPage.emailSync.connection")}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("settingsPage.emailSync.emailLabel")}:</span>
              <span className="ml-2 font-medium">{debugInfo.connection.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("settingsPage.emailSync.server")}:</span>
              <span className="ml-2 font-medium">{debugInfo.connection.imap_server}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("settingsPage.emailSync.syncRange")}:</span>
              <Badge variant="outline">{debugInfo.connection.sync_days_back_meaning}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">{t("settingsPage.emailSync.lastSync")}:</span>
              <span className="ml-2">
                {debugInfo.connection.last_sync_at
                  ? new Date(debugInfo.connection.last_sync_at).toLocaleString()
                  : t("settingsPage.emailSync.never")}
              </span>
            </div>
          </div>
          {debugInfo.connection.last_sync_error && (
            <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{debugInfo.connection.last_sync_error}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Update Sync Days */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t("settingsPage.emailSync.syncSettings")}
          </h4>
          <div className="flex items-end gap-3">
            <div className="space-y-2 flex-1">
              <Label htmlFor="sync-days">{t("settingsPage.emailSync.daysToSync")}</Label>
              <Input
                id="sync-days"
                type="number"
                min="0"
                placeholder={String(debugInfo.connection.sync_days_back)}
                value={syncDaysBack}
                onChange={(e) => setSyncDaysBack(e.target.value)}
              />
            </div>
            <Button
              onClick={handleUpdateSyncDays}
              disabled={!syncDaysBack || updateSettings.isPending}
            >
              {updateSettings.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {t("settingsPage.emailSync.update")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("settingsPage.emailSync.syncHint", { current: debugInfo.connection.sync_days_back_meaning })}
          </p>
        </div>

        <Separator />

        {/* Summary */}
        <div className="space-y-3">
          <h4 className="font-medium">{t("settingsPage.emailSync.summary")}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{debugInfo.summary.total_folders_on_server}</div>
              <div className="text-xs text-muted-foreground">{t("settingsPage.emailSync.totalFolders")}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-blue-600">{debugInfo.summary.folders_being_synced}</div>
              <div className="text-xs text-muted-foreground">{t("settingsPage.emailSync.syncing")}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-orange-600">{debugInfo.summary.folders_skipped}</div>
              <div className="text-xs text-muted-foreground">{t("settingsPage.emailSync.skipped")}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-green-600">{debugInfo.summary.total_messages_in_db}</div>
              <div className="text-xs text-muted-foreground">{t("settingsPage.emailSync.inDatabase")}</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Folders */}
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="synced-folders">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t("settingsPage.emailSync.syncedFolders", { count: debugInfo.folders.length })}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {debugInfo.folders.map((folder) => (
                  <FolderCard key={folder.name} folder={folder} t={t} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="skipped-folders">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <FolderX className="h-4 w-4 text-muted-foreground" />
                {t("settingsPage.emailSync.skippedFolders", { count: debugInfo.skipped_folders.length })}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {debugInfo.skipped_folders.map((folder) => (
                  <FolderCard key={folder.name} folder={folder} isSkipped t={t} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Errors */}
        {debugInfo.errors.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {t("settingsPage.emailSync.errors")}
              </h4>
              <ul className="space-y-1 text-sm text-destructive">
                {debugInfo.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
