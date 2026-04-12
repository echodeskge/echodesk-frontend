"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Tags, Trash2, Edit, Eye, X } from "lucide-react";
import { useAttributes, useDeleteAttribute } from "@/hooks/useAttributes";
import { AddAttributeSheet } from "@/components/attributes/AddAttributeSheet";
import { EditAttributeSheet } from "@/components/attributes/EditAttributeSheet";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { Locale } from "@/lib/i18n";
import type { AttributeDefinition } from "@/api/generated";

/** Safely extract a localized string from a multilingual name field. */
const getLocalizedName = (name: unknown, locale: string): string => {
  if (typeof name === "string") return name;
  if (typeof name === "object" && name !== null) {
    const nameObj = name as Record<string, string>;
    return nameObj[locale] || nameObj.en || Object.values(nameObj)[0] || "";
  }
  return "";
};

export default function ProductAttributesPage() {
  const locale = useLocale() as Locale;
  const t = useTranslations("productAttributes");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddAttributeOpen, setIsAddAttributeOpen] = useState(false);
  const [isEditAttributeOpen, setIsEditAttributeOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeDefinition | null>(null);
  const [deletingAttribute, setDeletingAttribute] = useState<AttributeDefinition | null>(null);
  const [isSidebarSheetOpen, setIsSidebarSheetOpen] = useState(false);

  // Fetch attributes with filters
  const { data: attributesData, isLoading } = useAttributes({
    search: searchQuery || undefined,
  });

  const deleteAttribute = useDeleteAttribute();

  const attributes = attributesData?.results || [];
  const totalCount = attributesData?.count || 0;

  // Get multilanguage name
  const getAttributeName = (attribute: AttributeDefinition) => {
    const name = getLocalizedName(attribute.name, locale);
    return name || "Unnamed Attribute";
  };

  // Get option label in current locale
  const getOptionLabel = (option: unknown): string => {
    if (typeof option === "string") return option;
    if (typeof option === "object" && option !== null) {
      const optObj = option as Record<string, string>;
      return optObj[locale] || optObj.en || optObj.value || "Unnamed";
    }
    return String(option);
  };

  // Get attribute type badge color
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      multiselect: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
      number: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAttribute) return;
    try {
      await deleteAttribute.mutateAsync(deletingAttribute.id);
      toast.success("Attribute deleted successfully");
      if (selectedAttribute?.id === deletingAttribute.id) {
        setSelectedAttribute(null);
        setIsSidebarSheetOpen(false);
      }
    } catch (error) {
      console.error("Failed to delete attribute:", error);
      toast.error("Failed to delete attribute");
    } finally {
      setDeletingAttribute(null);
    }
  };

  const handleEdit = (attribute: AttributeDefinition) => {
    setSelectedAttribute(attribute);
    setIsEditAttributeOpen(true);
  };

  const handleViewDetails = (attribute: AttributeDefinition) => {
    setSelectedAttribute(attribute);
    // On mobile, open as a sheet overlay
    setIsSidebarSheetOpen(true);
  };

  // Sidebar content shared between desktop inline and mobile sheet
  const sidebarContent = selectedAttribute ? (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">{getAttributeName(selectedAttribute)}</h2>
        <Badge className={getTypeColor(String(selectedAttribute.attribute_type))}>
          {t(`types.${selectedAttribute.attribute_type}`)}
        </Badge>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">{t("sidebar.details")}</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">{t("sidebar.key")}</span>
              <code className="ml-2 bg-muted px-1 rounded">
                {selectedAttribute.key}
              </code>
            </div>
            {selectedAttribute.unit && (
              <div>
                <span className="text-muted-foreground">{t("sidebar.unit")}</span>
                <span className="ml-2">{selectedAttribute.unit}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-2">{t("sidebar.properties")}</h3>
          <div className="space-y-2">
            {selectedAttribute.is_required && (
              <Badge variant="destructive" className="mr-2">
                {t("sidebar.required")}
              </Badge>
            )}
            {selectedAttribute.is_filterable && (
              <Badge variant="outline" className="mr-2">
                {t("sidebar.filterable")}
              </Badge>
            )}
            {selectedAttribute.is_active ? (
              <Badge variant="default" className="mr-2">
                {t("sidebar.active")}
              </Badge>
            ) : (
              <Badge variant="outline" className="mr-2 opacity-50">
                {t("sidebar.inactive")}
              </Badge>
            )}
          </div>
        </div>

        {selectedAttribute.options &&
          Array.isArray(selectedAttribute.options) &&
          selectedAttribute.options.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {t("sidebar.attributeValues")} ({selectedAttribute.options.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedAttribute.options.map((option: unknown, idx: number) => (
                    <Card key={idx} className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {getOptionLabel(option)}
                        </div>
                        {typeof option === "object" && option !== null && (option as Record<string, string>).value && (
                          <div className="text-xs text-muted-foreground">
                            {t("sidebar.value")} <code className="bg-muted px-1 rounded">{(option as Record<string, string>).value}</code>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

        <Separator />

        <Button
          className="w-full"
          onClick={() => {
            handleEdit(selectedAttribute);
          }}
        >
          <Edit className="h-4 w-4 mr-2" />
          {t("sidebar.editAttribute")}
        </Button>
      </div>
    </div>
  ) : null;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-9 w-56" />
              <Skeleton className="h-4 w-72 mt-2" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <div className="grid gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-6 w-16" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
          </div>
          <Button className="gap-2" onClick={() => setIsAddAttributeOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("addAttribute")}
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Attributes List */}
        {attributes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <Tags className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("noAttributesYet")}</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                {t("noAttributesDescription")}
              </p>
              <Button className="gap-2" onClick={() => setIsAddAttributeOpen(true)}>
                <Plus className="h-4 w-4" />
                {t("createFirstAttribute")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {attributes.map((attribute) => (
              <Card
                key={attribute.id}
                className={`hover:shadow-md transition-all cursor-pointer ${
                  selectedAttribute?.id === attribute.id
                    ? "ring-2 ring-primary"
                    : ""
                }`}
                onClick={() => handleViewDetails(attribute)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <CardTitle className="text-lg">
                          {getAttributeName(attribute)}
                        </CardTitle>
                        <Badge className={getTypeColor(String(attribute.attribute_type))}>
                          {t(`types.${attribute.attribute_type}`)}
                        </Badge>
                        {attribute.is_required && (
                          <Badge variant="destructive">{t("required")}</Badge>
                        )}
                        {attribute.is_filterable && (
                          <Badge variant="outline">{t("filterable")}</Badge>
                        )}
                        {!attribute.is_active && (
                          <Badge variant="outline" className="opacity-50">
                            {t("sidebar.inactive")}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-4 flex-wrap">
                        <span>
                          {t("key")}:{" "}
                          <code className="bg-muted px-1 rounded">
                            {attribute.key}
                          </code>
                        </span>
                        {attribute.unit && <span>{t("unit")}: {attribute.unit}</span>}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(attribute);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingAttribute(attribute);
                        }}
                        disabled={deleteAttribute.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {attribute.options &&
                  Array.isArray(attribute.options) &&
                  attribute.options.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        <span className="text-sm font-medium">
                          {t("options")} ({attribute.options.length}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {attribute.options.slice(0, 5).map((option: unknown, idx: number) => (
                            <Badge key={idx} variant="outline">
                              {getOptionLabel(option)}
                            </Badge>
                          ))}
                          {attribute.options.length > 5 && (
                            <Badge variant="secondary">
                              +{attribute.options.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
              </Card>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{totalCount}</div>
                <div className="text-sm text-muted-foreground">
                  {t("totalAttributes")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {attributes.filter((a) => a.is_required).length}
                </div>
                <div className="text-sm text-muted-foreground">{t("required")}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {attributes.filter((a) => a.is_filterable).length}
                </div>
                <div className="text-sm text-muted-foreground">{t("filterable")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Sidebar - hidden on mobile */}
      {selectedAttribute && (
        <div className="hidden lg:block w-80 border-l bg-muted/20 p-6 overflow-y-auto">
          {sidebarContent}
        </div>
      )}

      {/* Mobile Sidebar Sheet */}
      <Sheet open={isSidebarSheetOpen && !!selectedAttribute} onOpenChange={(open) => {
        setIsSidebarSheetOpen(open);
        if (!open) setSelectedAttribute(null);
      }}>
        <SheetContent className="w-full sm:max-w-[400px] overflow-y-auto lg:hidden">
          <SheetHeader>
            <SheetTitle>{getAttributeName(selectedAttribute!)}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAttribute} onOpenChange={(open) => {
        if (!open) setDeletingAttribute(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attribute</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAttribute ? getAttributeName(deletingAttribute) : ""}&quot;?
              This action cannot be undone.
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

      {/* Add Attribute Sheet */}
      <AddAttributeSheet
        open={isAddAttributeOpen}
        onOpenChange={setIsAddAttributeOpen}
      />

      {/* Edit Attribute Sheet */}
      <EditAttributeSheet
        open={isEditAttributeOpen}
        onOpenChange={setIsEditAttributeOpen}
        attribute={selectedAttribute}
      />
    </div>
  );
}
