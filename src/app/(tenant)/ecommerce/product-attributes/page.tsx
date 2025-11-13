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
import { Search, Plus, Tags, Trash2, Edit, Eye } from "lucide-react";
import { useAttributes, useDeleteAttribute } from "@/hooks/useAttributes";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AddAttributeSheet } from "@/components/attributes/AddAttributeSheet";
import { EditAttributeSheet } from "@/components/attributes/EditAttributeSheet";
import type { Locale } from "@/lib/i18n";
import type { AttributeDefinition } from "@/api/generated";

export default function ProductAttributesPage() {
  const locale = useLocale() as Locale;
  const t = useTranslations("productAttributes");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddAttributeOpen, setIsAddAttributeOpen] = useState(false);
  const [isEditAttributeOpen, setIsEditAttributeOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeDefinition | null>(null);

  // Fetch attributes with filters
  const { data: attributesData, isLoading } = useAttributes({
    search: searchQuery || undefined,
  });

  const deleteAttribute = useDeleteAttribute();

  const attributes = attributesData?.results || [];
  const totalCount = attributesData?.count || 0;

  // Get multilanguage name
  const getAttributeName = (attribute: AttributeDefinition) => {
    if (typeof attribute.name === "object" && attribute.name !== null) {
      return (attribute.name as any)[locale] || (attribute.name as any).en || "Unnamed Attribute";
    }
    return attribute.name || "Unnamed Attribute";
  };

  // Get option label in current locale
  const getOptionLabel = (option: any) => {
    if (typeof option === "object" && option !== null) {
      return option[locale] || option.en || option.value || "Unnamed";
    }
    return String(option);
  };

  // Get attribute type badge color
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      text: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      number: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      boolean: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      select: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      multiselect: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      date: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this attribute?")) {
      try {
        await deleteAttribute.mutateAsync(id);
      } catch (error) {
        console.error("Failed to delete attribute:", error);
        alert("Failed to delete attribute");
      }
    }
  };

  const handleEdit = (attribute: AttributeDefinition) => {
    setSelectedAttribute(attribute);
    setIsEditAttributeOpen(true);
  };

  const handleViewDetails = (attribute: AttributeDefinition) => {
    setSelectedAttribute(attribute);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
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
                          {String(attribute.attribute_type)}
                        </Badge>
                        {attribute.is_required && (
                          <Badge variant="destructive">{t("required")}</Badge>
                        )}
                        {attribute.is_variant_attribute && (
                          <Badge variant="secondary">{t("variant")}</Badge>
                        )}
                        {attribute.is_filterable && (
                          <Badge variant="outline">{t("filterable")}</Badge>
                        )}
                        {!attribute.is_active && (
                          <Badge variant="outline" className="opacity-50">
                            Inactive
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
                          handleDelete(attribute.id);
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
                          {attribute.options.slice(0, 5).map((option: any, idx: number) => (
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  {attributes.filter((a) => a.is_variant_attribute).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("variantAttributes")}
                </div>
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

      {/* Sidebar */}
      {selectedAttribute && (
        <div className="w-80 border-l bg-muted/20 p-6 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{getAttributeName(selectedAttribute)}</h2>
            <Badge className={getTypeColor(String(selectedAttribute.attribute_type))}>
              {String(selectedAttribute.attribute_type)}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Key:</span>
                  <code className="ml-2 bg-muted px-1 rounded">
                    {selectedAttribute.key}
                  </code>
                </div>
                {selectedAttribute.unit && (
                  <div>
                    <span className="text-muted-foreground">Unit:</span>
                    <span className="ml-2">{selectedAttribute.unit}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Sort Order:</span>
                  <span className="ml-2">{selectedAttribute.sort_order}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-2">Properties</h3>
              <div className="space-y-2">
                {selectedAttribute.is_required && (
                  <Badge variant="destructive" className="mr-2">
                    Required
                  </Badge>
                )}
                {selectedAttribute.is_variant_attribute && (
                  <Badge variant="secondary" className="mr-2">
                    Variant Attribute
                  </Badge>
                )}
                {selectedAttribute.is_filterable && (
                  <Badge variant="outline" className="mr-2">
                    Filterable
                  </Badge>
                )}
                {selectedAttribute.is_active ? (
                  <Badge variant="default" className="mr-2">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mr-2 opacity-50">
                    Inactive
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
                      Attribute Values ({selectedAttribute.options.length})
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedAttribute.options.map((option: any, idx: number) => (
                        <Card key={idx} className="p-3">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {getOptionLabel(option)}
                            </div>
                            {option.value && (
                              <div className="text-xs text-muted-foreground">
                                Value: <code className="bg-muted px-1 rounded">{option.value}</code>
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
              Edit Attribute
            </Button>
          </div>
        </div>
      )}

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
