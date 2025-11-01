"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Languages, Pencil, Trash2 } from "lucide-react";
import { useLanguages, useDeleteLanguage } from "@/hooks/useLanguages";
import LoadingSpinner from "@/components/LoadingSpinner";
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

export default function LanguagesPage() {
  const locale = useLocale() as Locale;
  const t = useTranslations("languages");
  const [isAddLanguageOpen, setIsAddLanguageOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [deletingLanguage, setDeletingLanguage] = useState<Language | null>(null);

  // Fetch languages
  const { data: languagesData, isLoading } = useLanguages({
    ordering: "sort_order,code",
  });

  const deleteLanguage = useDeleteLanguage();

  const languages = languagesData?.results || [];
  const totalCount = languagesData?.count || 0;

  // Get language name in current locale
  const getLanguageName = (language: Language) => {
    if (typeof language.name === "object" && language.name !== null) {
      return language.name[locale] || language.name.en || language.code;
    }
    return language.name || language.code;
  };

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
      console.error("Failed to delete language:", error);
    }
  };

  const handleCloseSheet = () => {
    setIsAddLanguageOpen(false);
    setEditingLanguage(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsAddLanguageOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("addLanguage")}
        </Button>
      </div>

      {/* Languages Table */}
      {languages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <Languages className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("noLanguagesYet")}</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {t("noLanguagesDescription")}
            </p>
            <Button className="gap-2" onClick={() => setIsAddLanguageOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("addFirstLanguage")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("allLanguages")}</CardTitle>
            <CardDescription>
              {t("totalLanguages", { count: totalCount })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.code")}</TableHead>
                  <TableHead>{t("table.name")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.type")}</TableHead>
                  <TableHead>{t("table.order")}</TableHead>
                  <TableHead className="text-right">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {languages.map((language) => (
                  <TableRow key={language.id}>
                    <TableCell className="font-mono font-medium">
                      {language.code}
                    </TableCell>
                    <TableCell>{getLanguageName(language)}</TableCell>
                    <TableCell>
                      {language.is_active ? (
                        <Badge variant="default">{t("active")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("inactive")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {language.is_default ? (
                        <Badge variant="outline">{t("default")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("custom")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{language.sort_order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(language)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingLanguage(language)}
                          disabled={language.is_default}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
                name: deletingLanguage ? getLanguageName(deletingLanguage) : "",
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
    </div>
  );
}
