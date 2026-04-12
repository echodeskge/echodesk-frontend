"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ecommerceAdminHomepageSectionsList,
  ecommerceAdminHomepageSectionsCreate,
  ecommerceAdminHomepageSectionsUpdate,
  ecommerceAdminHomepageSectionsPartialUpdate,
  ecommerceAdminHomepageSectionsDestroy,
  ecommerceAdminHomepageSectionsChoicesRetrieve,
  ecommerceAdminHomepageSectionsReorderCreate,
  itemListsList,
} from "@/api/generated";
import type {
  HomepageSection,
  HomepageSectionRequest,
  PatchedHomepageSectionRequest,
  ItemList,
  SectionTypeEnum,
  DisplayModeEnum,
} from "@/api/generated";
import axiosInstance from "@/api/axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  LayoutDashboard,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * Helper to cast string values to the opaque generated enum types.
 * The generated SectionTypeEnum and DisplayModeEnum are `{ [key: string]: any }`,
 * so string values are compatible at runtime but TypeScript requires an explicit cast.
 */
function asSectionType(value: string): SectionTypeEnum {
  return value as unknown as SectionTypeEnum;
}

function asDisplayMode(value: string): DisplayModeEnum {
  return value as unknown as DisplayModeEnum;
}

interface SectionChoices {
  section_types: { value: string; label: string }[];
  display_modes: { value: string; label: string }[];
}

interface HomepageVariant {
  key: string;
  name: string;
  description: string;
  section_count: number;
  section_types: string[];
}

const SECTION_LABELS: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  hero_banner: { label: "Hero", icon: "🖼", color: "text-blue-700", bgColor: "bg-blue-100 dark:bg-blue-900/40" },
  featured_products: { label: "Products", icon: "🛍", color: "text-violet-700", bgColor: "bg-violet-100 dark:bg-violet-900/40" },
  category_grid: { label: "Categories", icon: "📂", color: "text-emerald-700", bgColor: "bg-emerald-100 dark:bg-emerald-900/40" },
  statistics: { label: "Stats", icon: "📊", color: "text-amber-700", bgColor: "bg-amber-100 dark:bg-amber-900/40" },
  branches: { label: "Branches", icon: "📍", color: "text-red-700", bgColor: "bg-red-100 dark:bg-red-900/40" },
  custom_content: { label: "Content", icon: "📝", color: "text-gray-700", bgColor: "bg-gray-100 dark:bg-gray-800" },
  product_by_attribute: { label: "New Items", icon: "✨", color: "text-pink-700", bgColor: "bg-pink-100 dark:bg-pink-900/40" },
};

function MiniWireframeBlock({ type }: { type: string }) {
  const info = SECTION_LABELS[type] || { label: type, icon: "📄", color: "text-gray-600", bgColor: "bg-gray-100" };

  if (type === "hero_banner") {
    return (
      <div className={`${info.bgColor} rounded-md p-1.5 flex-1 min-h-[40px] flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-200/50 to-blue-300/30 dark:from-blue-800/30 dark:to-blue-700/20" />
        <span className="text-[10px] font-semibold z-10 opacity-80">{info.icon} {info.label}</span>
        <div className="flex gap-0.5 mt-1 z-10">
          <div className="w-1 h-1 rounded-full bg-current opacity-60" />
          <div className="w-1 h-1 rounded-full bg-current opacity-30" />
          <div className="w-1 h-1 rounded-full bg-current opacity-30" />
        </div>
      </div>
    );
  }

  if (type === "featured_products" || type === "product_by_attribute") {
    return (
      <div className={`${info.bgColor} rounded-md p-1.5`}>
        <span className="text-[8px] font-medium opacity-70 block mb-1">{info.icon} {info.label}</span>
        <div className="grid grid-cols-4 gap-0.5">
          {[0,1,2,3].map(i => (
            <div key={i} className="aspect-square rounded-sm bg-white/60 dark:bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (type === "category_grid") {
    return (
      <div className={`${info.bgColor} rounded-md p-1.5`}>
        <span className="text-[8px] font-medium opacity-70 block mb-1">{info.icon} {info.label}</span>
        <div className="grid grid-cols-3 gap-0.5">
          {[0,1,2].map(i => (
            <div key={i} className="aspect-[4/3] rounded-sm bg-white/60 dark:bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (type === "statistics") {
    return (
      <div className={`${info.bgColor} rounded-md p-1.5`}>
        <span className="text-[8px] font-medium opacity-70 block mb-1">{info.icon} {info.label}</span>
        <div className="grid grid-cols-4 gap-1">
          {["99+", "50", "200", "4.8"].map((n, i) => (
            <div key={i} className="text-center">
              <div className="text-[8px] font-bold opacity-60">{n}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "branches") {
    return (
      <div className={`${info.bgColor} rounded-md p-1.5`}>
        <span className="text-[8px] font-medium opacity-70 block mb-0.5">{info.icon} {info.label}</span>
        <div className="space-y-0.5">
          <div className="h-2 bg-white/60 dark:bg-white/10 rounded-sm w-3/4" />
          <div className="h-2 bg-white/60 dark:bg-white/10 rounded-sm w-2/3" />
        </div>
      </div>
    );
  }

  // custom_content and fallback
  return (
    <div className={`${info.bgColor} rounded-md p-1.5`}>
      <span className="text-[8px] font-medium opacity-70 block mb-0.5">{info.icon} {info.label}</span>
      <div className="space-y-0.5">
        <div className="h-1.5 bg-white/60 dark:bg-white/10 rounded-sm w-full" />
        <div className="h-1.5 bg-white/60 dark:bg-white/10 rounded-sm w-4/5" />
      </div>
    </div>
  );
}

export default function HomepageBuilderPage() {
  const t = useTranslations("homepageBuilder");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [deletingSection, setDeletingSection] = useState<HomepageSection | null>(null);
  const [confirmingVariant, setConfirmingVariant] = useState<HomepageVariant | null>(null);

  // Fetch sections using generated function
  const { data: sectionsData, isLoading } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: () => ecommerceAdminHomepageSectionsList(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch choices using generated function
  const { data: choices } = useQuery<SectionChoices>({
    queryKey: ["homepage-section-choices"],
    queryFn: () => ecommerceAdminHomepageSectionsChoicesRetrieve() as unknown as Promise<SectionChoices>,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch item lists using generated function
  const { data: itemListsData } = useQuery({
    queryKey: ["item-lists"],
    queryFn: () => itemListsList(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch homepage variants
  const { data: variants = [] } = useQuery<HomepageVariant[]>({
    queryKey: ["homepage-variants"],
    queryFn: async () => {
      const response = await axiosInstance.get(
        "/api/ecommerce/admin/homepage-sections/variants/"
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Apply variant mutation
  const applyVariant = useMutation({
    mutationFn: async (variantKey: string) => {
      const response = await axiosInstance.post(
        "/api/ecommerce/admin/homepage-sections/generate-from-variant/",
        { variant: variantKey }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      toast.success(t("variantApplied"));
      setConfirmingVariant(null);
    },
    onError: () => {
      toast.error(t("variantApplyFailed"));
      setConfirmingVariant(null);
    },
  });

  // Create section mutation
  const createSection = useMutation({
    mutationFn: (data: HomepageSectionRequest) => ecommerceAdminHomepageSectionsCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      toast.success(t("success.created"));
      setIsAddOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("error.create"));
    },
  });

  // Update section mutation
  const updateSection = useMutation({
    mutationFn: ({ id, data }: { id: number; data: HomepageSectionRequest }) =>
      ecommerceAdminHomepageSectionsUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      toast.success(t("success.updated"));
      setEditingSection(null);
      setIsAddOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("error.update"));
    },
  });

  // Delete section mutation
  const deleteSection = useMutation({
    mutationFn: (id: number) => ecommerceAdminHomepageSectionsDestroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      toast.success(t("success.deleted"));
      setDeletingSection(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("error.delete"));
    },
  });

  // Reorder sections mutation
  const reorderSections = useMutation({
    mutationFn: (sectionIds: number[]) =>
      ecommerceAdminHomepageSectionsReorderCreate({ section_ids: sectionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      toast.success(t("success.reordered"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("error.reorder"));
    },
  });

  // Toggle section active status
  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      ecommerceAdminHomepageSectionsPartialUpdate(id, { is_active } as PatchedHomepageSectionRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
    },
  });

  const sections: HomepageSection[] = sectionsData?.results || [];
  const itemLists = (itemListsData?.results || []) as ItemList[];

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...sections];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderSections.mutate(newOrder.map((s) => s.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const newOrder = [...sections];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderSections.mutate(newOrder.map((s) => s.id));
  };

  const handleEdit = (section: HomepageSection) => {
    setEditingSection(section);
    setIsAddOpen(true);
  };

  const handleCloseSheet = () => {
    setIsAddOpen(false);
    setEditingSection(null);
  };

  const getSectionTypeLabel = (type: SectionTypeEnum): string => {
    return choices?.section_types.find((t) => t.value === String(type))?.label || String(type);
  };

  const getDisplayModeLabel = (mode: DisplayModeEnum | undefined): string => {
    if (!mode) return "N/A";
    return choices?.display_modes.find((m) => m.value === String(mode))?.label || String(mode);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Variant picker skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border rounded-xl overflow-hidden">
                  <div className="bg-muted/50 p-2.5 border-b">
                    <Skeleton className="h-[140px] w-full" />
                  </div>
                  <div className="p-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section list skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-16 w-8" />
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-10" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addSection")}
        </Button>
      </div>

      {/* Variant Picker */}
      {variants.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("homepageVariants")}</CardTitle>
            <CardDescription>{t("homepageVariantsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {variants.map((variant) => (
                <div
                  key={variant.key}
                  className="group border rounded-xl overflow-hidden hover:border-primary hover:shadow-md cursor-pointer transition-all"
                  onClick={() => setConfirmingVariant(variant)}
                >
                  {/* Page preview */}
                  <div className="bg-muted/50 p-2.5 border-b">
                    {/* Browser chrome */}
                    <div className="flex items-center gap-1 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <div className="flex-1 h-2.5 bg-white/80 dark:bg-white/10 rounded-full ml-2" />
                    </div>
                    {/* Page sections */}
                    <div className="bg-white dark:bg-gray-900 rounded-md p-1.5 space-y-1 min-h-[140px]">
                      {variant.section_types.map((type: string, i: number) => (
                        <MiniWireframeBlock key={i} type={type} />
                      ))}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm">{variant.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {variant.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {t("sectionCount", { count: variant.section_count })}
                      </span>
                      <span className="text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        {t("applyVariant")} →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            {t("sections")}
          </CardTitle>
          <CardDescription>
            {t("sectionsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("noSections")}
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg ${
                    section.is_active ? "bg-white" : "bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === sections.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <GripVertical className="h-5 w-5 text-muted-foreground" />

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {typeof section.title === "object"
                          ? section.title.en || Object.values(section.title)[0]
                          : section.title}
                      </h3>
                      <Badge variant="outline">{getSectionTypeLabel(section.section_type)}</Badge>
                      <Badge variant="secondary">{getDisplayModeLabel(section.display_mode)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("position")}: {section.position} |
                      {section.item_list
                        ? ` ${t("linkedTo")}: ${section.item_list_title || `ItemList #${section.item_list}`}`
                        : ` ${t("noItemListLinked")}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={section.is_active}
                      onCheckedChange={(checked) =>
                        toggleActive.mutate({ id: section.id, is_active: checked })
                      }
                    />
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(section)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingSection(section)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Section Sheet */}
      <SectionFormSheet
        open={isAddOpen}
        onClose={handleCloseSheet}
        section={editingSection}
        choices={choices}
        itemLists={itemLists}
        onSubmit={(data) => {
          if (editingSection) {
            updateSection.mutate({ id: editingSection.id, data });
          } else {
            createSection.mutate(data);
          }
        }}
        isLoading={createSection.isPending || updateSection.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSection} onOpenChange={() => setDeletingSection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteSection")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteSectionConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSection && deleteSection.mutate(deletingSection.id)}
              className="bg-destructive text-destructive-foreground"
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Variant Apply Confirmation */}
      <AlertDialog
        open={!!confirmingVariant}
        onOpenChange={() => setConfirmingVariant(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("replaceHomepageTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("replaceHomepageDescription", {
                name: confirmingVariant?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmingVariant && applyVariant.mutate(confirmingVariant.key)
              }
              disabled={applyVariant.isPending}
            >
              {applyVariant.isPending ? "Applying..." : t("replaceAndGenerate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Section Form Sheet Component
function SectionFormSheet({
  open,
  onClose,
  section,
  choices,
  itemLists,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  section: HomepageSection | null;
  choices?: SectionChoices;
  itemLists: ItemList[];
  onSubmit: (data: HomepageSectionRequest) => void;
  isLoading: boolean;
}) {
  const t = useTranslations("homepageBuilder");
  const tCommon = useTranslations("common");
  const [formData, setFormData] = useState<{
    title: { en: string; ka: string };
    subtitle: { en: string; ka: string };
    section_type: string;
    display_mode: string;
    item_list: number | null;
    attribute_key: string;
    attribute_value: string;
    background_color: string;
    background_image_url: string;
    text_color: string;
    settings: Record<string, unknown>;
  }>({
    title: { en: "", ka: "" },
    subtitle: { en: "", ka: "" },
    section_type: "hero_banner",
    display_mode: "slider",
    item_list: null,
    attribute_key: "",
    attribute_value: "",
    background_color: "",
    background_image_url: "",
    text_color: "",
    settings: {},
  });

  // Reset form when opening/closing
  useEffect(() => {
    if (open && section) {
      setFormData({
        title: typeof section.title === "object" ? section.title : { en: section.title as string, ka: "" },
        subtitle: typeof section.subtitle === "object" ? section.subtitle : { en: "", ka: "" },
        section_type: String(section.section_type),
        display_mode: String(section.display_mode || "grid"),
        item_list: section.item_list || null,
        attribute_key: section.attribute_key || "",
        attribute_value: section.attribute_value || "",
        background_color: section.background_color || "",
        background_image_url: section.background_image_url || "",
        text_color: section.text_color || "",
        settings: section.settings || {},
      });
    } else if (open) {
      setFormData({
        title: { en: "", ka: "" },
        subtitle: { en: "", ka: "" },
        section_type: "hero_banner",
        display_mode: "slider",
        item_list: null,
        attribute_key: "",
        attribute_value: "",
        background_color: "",
        background_image_url: "",
        text_color: "",
        settings: {},
      });
    }
  }, [open, section]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requestData: HomepageSectionRequest = {
      title: formData.title,
      subtitle: formData.subtitle,
      section_type: asSectionType(formData.section_type),
      display_mode: asDisplayMode(formData.display_mode),
      item_list: formData.item_list || undefined,
      attribute_key: formData.attribute_key || undefined,
      attribute_value: formData.attribute_value || undefined,
      background_color: formData.background_color || undefined,
      background_image_url: formData.background_image_url || undefined,
      text_color: formData.text_color || undefined,
      settings: formData.settings,
    };
    onSubmit(requestData);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto px-6">
        <SheetHeader>
          <SheetTitle>{section ? t("editSection") : t("addNewSection")}</SheetTitle>
          <SheetDescription>
            {t("sectionFormDescription")}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>{t("titleEnglish")}</Label>
            <Input
              value={formData.title.en}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  title: { ...prev.title, en: e.target.value },
                }))
              }
              placeholder="Featured Products"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t("titleGeorgian")}</Label>
            <Input
              value={formData.title.ka}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  title: { ...prev.title, ka: e.target.value },
                }))
              }
              placeholder="რჩეული პროდუქტები"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("sectionType")}</Label>
            <Select
              value={formData.section_type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, section_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {choices?.section_types.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("displayMode")}</Label>
            <Select
              value={formData.display_mode}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, display_mode: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {choices?.display_modes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("linkToItemList")}</Label>
            <Select
              value={formData.item_list?.toString() || "none"}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  item_list: value === "none" ? null : parseInt(value),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectItemList")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noItemList")}</SelectItem>
                {itemLists.map((list) => (
                  <SelectItem key={list.id} value={list.id.toString()}>
                    {list.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("backgroundColor")}</Label>
            <Input
              value={formData.background_color}
              onChange={(e) => setFormData((prev) => ({ ...prev, background_color: e.target.value }))}
              placeholder="#f5f5f5"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("backgroundImageUrl")}</Label>
            <Input
              value={formData.background_image_url}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, background_image_url: e.target.value }))
              }
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? tCommon("saving") : section ? tCommon("update") : tCommon("create")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
