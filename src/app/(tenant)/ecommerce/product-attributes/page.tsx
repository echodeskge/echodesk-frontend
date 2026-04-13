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

export default function ProductAttributesPage() {
  const locale = useLocale() as Locale
  const t = useTranslations("productAttributes")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedAttribute, setSelectedAttribute] =
    useState<AttributeDefinition | null>(null)
  const [deletingAttribute, setDeletingAttribute] =
    useState<AttributeDefinition | null>(null)

  const { data: attributesData, isLoading } = useAttributes({})
  const deleteAttribute = useDeleteAttribute()

  const attributes = attributesData?.results || []

  const getLocalizedName = (name: unknown): string => {
    if (!name) return "Unnamed"
    if (typeof name === "string") return name
    if (typeof name === "object") {
      const obj = name as Record<string, string>
      return obj[locale] || obj.en || Object.values(obj)[0] || "Unnamed"
    }
    return "Unnamed"
  }

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
      toast.success("Attribute deleted successfully")
    } catch {
      toast.error("Failed to delete attribute")
    } finally {
      setDeletingAttribute(null)
    }
  }

  return (
    <section className="container p-4">
      <AttributesTable
        data={attributes}
        loading={isLoading}
        locale={locale}
        onAdd={() => setIsAddOpen(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        t={t}
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
            <AlertDialogTitle>Delete Attribute</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {deletingAttribute
                ? getLocalizedName(deletingAttribute.name)
                : ""}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
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
    </section>
  )
}
