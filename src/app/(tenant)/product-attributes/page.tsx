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
import { Search, Plus, Tags, Trash2, Edit } from "lucide-react";
import { useAttributes, useDeleteAttribute } from "@/hooks/useAttributes";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AddAttributeSheet } from "@/components/attributes/AddAttributeSheet";
import type { Locale } from "@/lib/i18n";
import type { AttributeDefinition } from "@/api/generated";

export default function ProductAttributesPage() {
  const locale = useLocale() as Locale;
  const t = useTranslations("productAttributes");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddAttributeOpen, setIsAddAttributeOpen] = useState(false);

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
      return attribute.name[locale] || attribute.name.en || "Unnamed Attribute";
    }
    return attribute.name || "Unnamed Attribute";
  };

  // Get attribute type badge color
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      text: "bg-blue-100 text-blue-800",
      number: "bg-green-100 text-green-800",
      boolean: "bg-purple-100 text-purple-800",
      select: "bg-orange-100 text-orange-800",
      multiselect: "bg-pink-100 text-pink-800",
      color: "bg-red-100 text-red-800",
      date: "bg-indigo-100 text-indigo-800",
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
            <Card key={attribute.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
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
                    </div>
                    <CardDescription className="flex items-center gap-4">
                      <span>{t("key")}: <code className="bg-muted px-1 rounded">{attribute.key}</code></span>
                      {attribute.unit && <span>{t("unit")}: {attribute.unit}</span>}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {/* TODO: Edit */}}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(attribute.id)}
                      disabled={deleteAttribute.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {attribute.options && (
                <CardContent>
                  <div className="text-sm">
                    <span className="font-medium">{t("options")}: </span>
                    {typeof attribute.options === 'object' && attribute.options !== null
                      ? JSON.stringify(attribute.options)
                      : String(attribute.options)}
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
              <div className="text-sm text-muted-foreground">{t("totalAttributes")}</div>
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
              <div className="text-sm text-muted-foreground">{t("variantAttributes")}</div>
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

      {/* Add Attribute Sheet */}
      <AddAttributeSheet open={isAddAttributeOpen} onOpenChange={setIsAddAttributeOpen} />
    </div>
  );
}
