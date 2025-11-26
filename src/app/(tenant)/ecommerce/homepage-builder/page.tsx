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
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  LayoutDashboard,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
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

interface SectionChoices {
  section_types: { value: string; label: string }[];
  display_modes: { value: string; label: string }[];
}

export default function HomepageBuilderPage() {
  const t = useTranslations("homepageBuilder");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [deletingSection, setDeletingSection] = useState<HomepageSection | null>(null);

  // Fetch sections using generated function
  const { data: sectionsData, isLoading } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: () => ecommerceAdminHomepageSectionsList(),
  });

  // Fetch choices using generated function
  const { data: choices } = useQuery<SectionChoices>({
    queryKey: ["homepage-section-choices"],
    queryFn: () => ecommerceAdminHomepageSectionsChoicesRetrieve() as unknown as Promise<SectionChoices>,
  });

  // Fetch item lists using generated function
  const { data: itemListsData } = useQuery({
    queryKey: ["item-lists"],
    queryFn: () => itemListsList(),
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
    return choices?.section_types.find((t) => t.value === (type as unknown as string))?.label || String(type);
  };

  const getDisplayModeLabel = (mode: DisplayModeEnum | undefined): string => {
    if (!mode) return "N/A";
    return choices?.display_modes.find((m) => m.value === (mode as unknown as string))?.label || String(mode);
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
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addSection")}
        </Button>
      </div>

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
    section_type: SectionTypeEnum;
    display_mode: DisplayModeEnum;
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
    section_type: "hero_banner" as unknown as SectionTypeEnum,
    display_mode: "slider" as unknown as DisplayModeEnum,
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
        section_type: section.section_type,
        display_mode: section.display_mode || ("grid" as unknown as DisplayModeEnum),
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
        section_type: "hero_banner" as unknown as SectionTypeEnum,
        display_mode: "slider" as unknown as DisplayModeEnum,
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
      section_type: formData.section_type,
      display_mode: formData.display_mode,
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
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto px-6">
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
              value={formData.section_type as unknown as string}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, section_type: value as unknown as SectionTypeEnum }))
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
              value={formData.display_mode as unknown as string}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, display_mode: value as unknown as DisplayModeEnum }))
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
