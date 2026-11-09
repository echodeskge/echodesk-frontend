"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages, Pencil, Plus, Trash2 } from "lucide-react";
import { useLanguages, useDeleteLanguage } from "@/hooks/useLanguages";
import { AddLanguageSheet } from "@/components/languages/AddLanguageSheet";
import type { Locale } from "@/lib/i18n";
import type { Language } from "@/api/generated";
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
import { toast } from "sonner";
import { cn, getApiErrorMessage } from "@/lib/utils";
import {
  ActivePill,
  EcEmptyState,
  EcPage,
  EcTable,
  EcommerceHeaderBridge,
  IdText,
  TonePill,
  localizedText,
  rdButton,
  type EcColumn,
} from "@/app/(tenant)/ecommerce/_components/ui";

/** A language's name in the UI language, then English, then its code. */
function languageDisplayName(language: Pick<Language, "name" | "code">, locale: string): string {
  return localizedText(language.name as Parameters<typeof localizedText>[0], locale) || language.code;
}

export default function LanguagesPage() {
  const locale = useLocale() as Locale;
  const t = useTranslations("languages");
  const tc = useTranslations("common");
  const [isAddLanguageOpen, setIsAddLanguageOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [deletingLanguage, setDeletingLanguage] = useState<Language | null>(null);

  // Fetch languages
  const { data: languagesData, error, refetch } = useLanguages({
    ordering: "sort_order,code",
  });

  const deleteLanguage = useDeleteLanguage();

  const languages = languagesData?.results || [];
  const totalCount = languagesData?.count || 0;

  const handleEdit = (language: Language) => {
    setEditingLanguage(language);
    setIsAddLanguageOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingLanguage) return;

    try {
      await deleteLanguage.mutateAsync(deletingLanguage.id);
      setDeletingLanguage(null);
    } catch (error) {
      // The mutation has no onError: say why instead of failing silently.
      toast.error(getApiErrorMessage(error, t("deleteFailed")));
    }
  };

  const handleCloseSheet = () => {
    setIsAddLanguageOpen(false);
    setEditingLanguage(null);
  };

  const columns = useMemo<EcColumn<Language>[]>(
    () => [
      {
        id: "code",
        header: t("table.code"),
        width: "88px",
        mobile: "meta",
        cell: (l) => <IdText className="font-medium">{l.code}</IdText>,
      },
      {
        id: "name",
        header: t("table.name"),
        width: "minmax(0,2fr)",
        mobile: "title",
        cell: (l) => <span className="truncate font-medium">{languageDisplayName(l, locale)}</span>,
      },
      {
        id: "type",
        header: t("table.type"),
        width: "minmax(0,1fr)",
        mobile: "meta",
        cell: (l) =>
          l.is_default ? <TonePill tone="info">{t("default")}</TonePill> : <TonePill tone="neutral">{t("custom")}</TonePill>,
      },
      {
        id: "order",
        header: t("table.order"),
        width: "72px",
        align: "end",
        mobile: "hidden",
        numeric: true,
        cell: (l) => l.sort_order,
      },
      {
        id: "status",
        header: t("table.status"),
        width: "104px",
        mobile: "meta",
        cell: (l) => <ActivePill active={l.is_active} />,
      },
      {
        id: "actions",
        header: <span className="sr-only">{t("table.actions")}</span>,
        width: "64px",
        align: "end",
        mobile: "end",
        cell: (l) => (
          <span className="flex items-center gap-0.5">
            <button
              type="button"
              className={rdButton.ghostIconSm}
              onClick={() => handleEdit(l)}
              aria-label={`${tc("edit")}: ${languageDisplayName(l, locale)}`}
              title={tc("edit")}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
              onClick={() => setDeletingLanguage(l)}
              disabled={l.is_default}
              aria-label={`${tc("delete")}: ${languageDisplayName(l, locale)}`}
              title={l.is_default ? t("defaultCannotDelete") : tc("delete")}
              data-testid="ec-language-delete"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        ),
      },
    ],
    [t, tc, locale]
  );

  return (
    <EcPage width="wide" testId="ec-languages-page">
      <EcommerceHeaderBridge
        sub={languagesData ? t("countLabel", { count: totalCount }) : null}
        primary={{ label: t("addLanguage"), icon: Plus, onClick: () => setIsAddLanguageOpen(true), testId: "ec-languages-add" }}
      />

      <p className="text-[13px] text-muted-foreground">{t("subtitle")}</p>

      <EcTable<Language>
        variant="card"
        ariaLabel={t("allLanguages")}
        columns={columns}
        rows={languagesData ? languages : undefined}
        rowKey={(l) => l.id}
        error={error}
        onRetry={() => refetch()}
        onRowClick={handleEdit}
        skeletonRows={4}
        testId="ec-languages-table"
        empty={
          <EcEmptyState
            icon={Languages}
            title={t("noLanguagesYet")}
            description={t("noLanguagesDescription")}
            action={
              <button type="button" className={rdButton.primary} onClick={() => setIsAddLanguageOpen(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t("addFirstLanguage")}
              </button>
            }
          />
        }
        footer={!error && languages.length > 0 ? <span>{t("totalLanguages", { count: totalCount })}</span> : undefined}
      />

      {/* Add/Edit Language Sheet */}
      <AddLanguageSheet
        open={isAddLanguageOpen}
        onOpenChange={handleCloseSheet}
        editingLanguage={editingLanguage}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingLanguage}
        onOpenChange={(open) => !open && setDeletingLanguage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", {
                name: deletingLanguage ? languageDisplayName(deletingLanguage, locale) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EcPage>
  );
}
