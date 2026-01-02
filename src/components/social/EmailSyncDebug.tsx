"use client";

import { useState } from "react";
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

function FolderCard({ folder, isSkipped }: { folder: EmailSyncFolderDebug; isSkipped?: boolean }) {
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
              Skipped
            </Badge>
          )}
        </div>
        {!isSkipped && (
          <div className="text-sm text-muted-foreground space-y-0.5">
            {folder.total_messages_on_server !== undefined && (
              <p>Server: {folder.total_messages_on_server} messages</p>
            )}
            {folder.messages_matching_filter !== undefined && (
              <p>Matching filter: {folder.messages_matching_filter} messages</p>
            )}
            {folder.messages_already_synced !== undefined && (
              <p>Already synced: {folder.messages_already_synced} messages</p>
            )}
            {folder.search_filter && (
              <p className="text-xs font-mono bg-muted px-1 rounded">
                Filter: {folder.search_filter}
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

export function EmailSyncDebug() {
  const { toast } = useToast();
  const { data: debugInfo, isLoading, refetch, isRefetching } = useEmailSyncDebug();
  const syncMutation = useEmailSync();
  const updateSettings = useUpdateEmailSyncSettings();

  const [syncDaysBack, setSyncDaysBack] = useState<string>("");

  const handleRefresh = () => {
    refetch();
  };

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast({
          title: "Sync completed",
          description: `Synced ${data.new_messages} new messages`,
        });
        refetch();
      },
      onError: (error: Error) => {
        toast({
          title: "Sync failed",
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
        title: "Invalid value",
        description: "Please enter 0 or a positive number",
        variant: "destructive",
      });
      return;
    }

    updateSettings.mutate(days, {
      onSuccess: (data) => {
        toast({
          title: "Settings updated",
          description: `Sync days set to ${data.meaning}`,
        });
        setSyncDaysBack("");
        refetch();
      },
      onError: (error: Error) => {
        toast({
          title: "Update failed",
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
            Email Sync Debug
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
            Email Sync Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No email connection configured</p>
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
              Email Sync Debug
            </CardTitle>
            <CardDescription>
              Debug information for email synchronization
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
              Sync Now
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Info */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Connection
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>
              <span className="ml-2 font-medium">{debugInfo.connection.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Server:</span>
              <span className="ml-2 font-medium">{debugInfo.connection.imap_server}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sync range:</span>
              <Badge variant="outline">{debugInfo.connection.sync_days_back_meaning}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Last sync:</span>
              <span className="ml-2">
                {debugInfo.connection.last_sync_at
                  ? new Date(debugInfo.connection.last_sync_at).toLocaleString()
                  : "Never"}
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
            Sync Settings
          </h4>
          <div className="flex items-end gap-3">
            <div className="space-y-2 flex-1">
              <Label htmlFor="sync-days">Days to sync (0 = all history)</Label>
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
              Update
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Set to 0 to sync all email history. Current: {debugInfo.connection.sync_days_back_meaning}
          </p>
        </div>

        <Separator />

        {/* Summary */}
        <div className="space-y-3">
          <h4 className="font-medium">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{debugInfo.summary.total_folders_on_server}</div>
              <div className="text-xs text-muted-foreground">Total Folders</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-blue-600">{debugInfo.summary.folders_being_synced}</div>
              <div className="text-xs text-muted-foreground">Syncing</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-orange-600">{debugInfo.summary.folders_skipped}</div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-green-600">{debugInfo.summary.total_messages_in_db}</div>
              <div className="text-xs text-muted-foreground">In Database</div>
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
                Synced Folders ({debugInfo.folders.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {debugInfo.folders.map((folder) => (
                  <FolderCard key={folder.name} folder={folder} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="skipped-folders">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <FolderX className="h-4 w-4 text-muted-foreground" />
                Skipped Folders ({debugInfo.skipped_folders.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {debugInfo.skipped_folders.map((folder) => (
                  <FolderCard key={folder.name} folder={folder} isSkipped />
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
                Errors
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
