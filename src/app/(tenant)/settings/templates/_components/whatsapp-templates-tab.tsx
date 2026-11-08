"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { isAxiosError } from "axios";
import { AlertCircle, FileText, Info, Loader2, RefreshCw, Send, Trash2 } from "lucide-react";

import type { WhatsAppMessageTemplate } from "@/api/generated";
import {
  useDeleteWhatsAppTemplate,
  useSyncWhatsAppTemplates,
  useWhatsAppStatus,
  useWhatsAppTemplates,
} from "@/hooks/api/useSocial";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NewWhatsAppMessageDialog } from "@/components/messages-beta/sidebar/NewWhatsAppMessageDialog";
import { templatePreviewText, templateStatusClass } from "./template-utils";

interface WhatsAppStatus {
  connected: boolean;
  accounts?: Array<{ waba_id: string; business_name: string }>;
}

const outlineSm =
  "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-2.5 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-50";

function apiError(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;
  const data = error.response?.data as { error?: string; detail?: string } | undefined;
  return data?.error || data?.detail;
}

/** Design template cards: info bar + Sync from Meta, then a 300px card grid. */
export function WhatsAppTemplatesTab() {
  const t = useTranslations("settings.templatesPage");
  const tTpl = useTranslations("social.templates");
  const [error, setError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppMessageTemplate | null>(null);

  const { data: statusData, isLoading: statusLoading } = useWhatsAppStatus();
  const status = statusData as WhatsAppStatus | undefined;
  const wabaId = status?.accounts?.[0]?.waba_id || "";
  const { data: templates, isLoading, refetch } = useWhatsAppTemplates(wabaId);
  const sync = useSyncWhatsAppTemplates();
  const remove = useDeleteWhatsAppTemplate();

  async function handleSync() {
    if (!wabaId) return;
    setError("");
    try {
      await sync.mutateAsync(wabaId);
      await refetch();
    } catch (err) {
      setError(apiError(err) || tTpl("syncFailed"));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setError("");
    try {
      await remove.mutateAsync(deleteTarget.id);
      await refetch();
    } catch (err) {
      setError(apiError(err) || tTpl("deleteFailed"));
    } finally {
      setDeleteTarget(null);
    }
  }

  if (statusLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status?.connected || !wabaId) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-border px-6 py-12 text-center" data-testid="templates-connect-first">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
        <p className="max-w-md text-[13px] text-muted-foreground">{tTpl("connectFirst")}</p>
        <Button asChild size="sm">
          <Link href="/settings/social/connections">{tTpl("goToConnections")}</Link>
        </Button>
      </div>
    );
  }

  const list = (templates ?? []) as WhatsAppMessageTemplate[];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-[13px] w-[13px] shrink-0" />
        <span className="min-w-[200px] flex-1">{t("windowInfo")}</span>
        <button type="button" className={cn(outlineSm, "ms-auto")} onClick={handleSync} disabled={sync.isPending} data-testid="templates-sync">
          <RefreshCw className={cn("h-[13px] w-[13px]", sync.isPending && "animate-spin")} />
          {tTpl("syncFromMeta")}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center rounded-[10px] border border-dashed border-border px-6 py-12 text-center" data-testid="templates-empty">
          <FileText className="mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-[13px] font-medium">{tTpl("noTemplates")}</p>
          <p className="mt-0.5 max-w-md text-xs text-muted-foreground">{tTpl("noTemplatesDescription")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3" data-testid="templates-grid">
          {list.map((template) => {
            const approved = template.status === "APPROVED";
            const category = template.category ? tTpl(`category.${template.category}`) : "";
            return (
              <article key={template.id} className="flex flex-col gap-2.5 rounded-lg border border-border p-3.5" data-testid={`template-${template.id}`}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-semibold leading-5 [overflow-wrap:anywhere]">{template.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(template.language || "").toUpperCase()}
                      {category ? ` · ${category}` : ""}
                    </p>
                  </div>
                  {template.status && (
                    <span className={cn("inline-flex h-5 shrink-0 items-center rounded border px-[7px] text-[11px] font-medium", templateStatusClass(template.status))}>
                      {tTpl(`status.${template.status}`)}
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap rounded-[10px_10px_10px_2px] bg-muted/60 px-3 py-2.5 text-[13px] leading-[19px] [overflow-wrap:anywhere]">
                  {templatePreviewText(template) || "—"}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setComposeOpen(true)}
                    disabled={!approved}
                    title={approved ? undefined : t("useNeedsApproval")}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    {t("use")}
                  </button>
                  <button
                    type="button"
                    aria-label={t("deleteTemplate", { name: template.name })}
                    onClick={() => setDeleteTarget(template)}
                    disabled={remove.isPending}
                    className="ms-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <NewWhatsAppMessageDialog open={composeOpen} onOpenChange={setComposeOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{tTpl("confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
