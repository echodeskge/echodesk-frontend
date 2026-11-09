"use client"

import { useState, useCallback } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useAttributes, useDeleteAttribute } from "@/hooks/useAttributes"
import { AddAttributeSheet } from "@/components/attributes/AddAttributeSheet"
import { EditAttributeSheet } from "@/components/attributes/EditAttributeSheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import type { Locale } from "@/lib/i18n"
import type { AttributeDefinition } from "@/api/generated"
import { AttributesTable } from "./_components/attributes-table"
import { getApiErrorMessage } from "@/lib/utils"
import { Plus } from "lucide-react"
import { EcPage, EcommerceHeaderBridge } from "@/app/(tenant)/ecommerce/_components/ui"
import { attributeName } from "./_components/attributes-table-columns"

export default function ProductAttributesPage() {
  const locale = useLocale() as Locale
  const t = useTranslations("productAttributes")
  const tc = useTranslations("common")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedAttribute, setSelectedAttribute] =
    useState<AttributeDefinition | null>(null)
  const [deletingAttribute, setDeletingAttribute] =
    useState<AttributeDefinition | null>(null)

  const { data: attributesData, error: attributesError, refetch } = useAttributes({})
  const deleteAttribute = useDeleteAttribute()

  const attributes = attributesData?.results || []

  const handleEdit = useCallback((attribute: AttributeDefinition) => {
    setSelectedAttribute(attribute)
    setIsEditOpen(true)
  }, [])

  const handleDelete = useCallback((attribute: AttributeDefinition) => {
    setDeletingAttribute(attribute)
  }, [])

  const handleDeleteConfirm = async () => {
    if (!deletingAttribute) return
    try {
      await deleteAttribute.mutateAsync(deletingAttribute.id)
      toast.success(t("deleted"))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("deleteFailed")))
    } finally {
      setDeletingAttribute(null)
    }
  }

  return (
    <EcPage width="wide" testId="ec-attributes-page">
      <EcommerceHeaderBridge
        sub={attributesData ? t("countLabel", { count: attributes.length }) : null}
        primary={{ label: t("addAttribute"), icon: Plus, onClick: () => setIsAddOpen(true), testId: "ec-attributes-add" }}
      />
      <AttributesTable
        data={attributesData ? attributes : undefined}
        error={attributesError}
        onRetry={() => refetch()}
        locale={locale}
        onAdd={() => setIsAddOpen(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingAttribute}
        onOpenChange={(open) => {
          if (!open) setDeletingAttribute(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", {
                name: deletingAttribute ? attributeName(deletingAttribute, locale) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddAttributeSheet open={isAddOpen} onOpenChange={setIsAddOpen} />
      <EditAttributeSheet
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        attribute={selectedAttribute}
      />
    </EcPage>
  )
}
