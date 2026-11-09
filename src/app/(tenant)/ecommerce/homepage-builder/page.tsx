"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
} from "@/api/generated";
import axiosInstance from "@/api/axios";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LayoutDashboard } from "lucide-react";
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
import { getApiErrorMessage } from "@/lib/utils";
import {
  EcEmptyState,
  EcErrorState,
  EcPage,
  EcPageHeader,
  EcommerceHeaderBridge,
  SectionCard,
  rdButton,
} from "../_components/ui";
import { SectionFormSheet, type SectionChoices } from "./_components/section-form-sheet";
import { SectionRow } from "./_components/section-row";
import { TemplateCard } from "./_components/template-card";
import {
  displayModeLabel,
  sectionTitle,
  sectionTypeLabel,
  variantText,
  type LabelTranslator,
} from "./_lib/labels";

interface HomepageVariant {
  key: string;
  name: string;
  description: string;
  section_count: number;
  section_types: string[];
}

const TEMPLATE_GRID =
  "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]";

export default function HomepageBuilderPage() {
  const t = useTranslations("homepageBuilder");
  const tl = t as unknown as LabelTranslator;
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [deletingSection, setDeletingSection] = useState<HomepageSection | null>(null);
  const [confirmingVariant, setConfirmingVariant] = useState<HomepageVariant | null>(null);

  // Fetch sections using generated function
  const {
    data: sectionsData,
    isLoading,
    isError,
    error: sectionsError,
    refetch: refetchSections,
  } = useQuery({
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
      toast.error(getApiErrorMessage(error, t("error.create")));
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
      toast.error(getApiErrorMessage(error, t("error.update")));
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
      toast.error(getApiErrorMessage(error, t("error.delete")));
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
      toast.error(getApiErrorMessage(error, t("error.reorder")));
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

  const openAdd = () => setIsAddOpen(true);

  const sectionMeta = (section: HomepageSection): string => {
    const linked = section.item_list
      ? t("linkedToList", {
          name: section.item_list_title || t("itemListFallback", { id: section.item_list }),
        })
      : t("noItemListLinked");
    return `${t("position")}: ${section.position} · ${linked}`;
  };

  return (
    <>
      <EcommerceHeaderBridge
        sub={!isLoading && !isError ? t("sectionCount", { count: sections.length }) : null}
        primary={{ label: t("addSection"), icon: Plus, onClick: openAdd, testId: "hb-add" }}
      />
      <EcPage width="wide" gap={20} testId="homepage-builder-page">
        <EcPageHeader
          icon={LayoutDashboard}
          title={t("title")}
          description={t("subtitle")}
          action={
            <button type="button" className={`${rdButton.outline} max-sm:hidden`} onClick={openAdd}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t("addSection")}
            </button>
          }
        />

        {/* Templates */}
        {isLoading ? (
          <SectionCard title={t("homepageVariants")} hint={t("homepageVariantsDescription")}>
            <div className={`${TEMPLATE_GRID} p-4`} aria-hidden>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="overflow-hidden rounded-lg border">
                  <div className="border-b bg-muted/50 p-2">
                    <Skeleton className="h-[140px] w-full" />
                  </div>
                  <div className="space-y-1.5 p-3">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : (
          variants.length > 0 && (
            <SectionCard
              title={t("homepageVariants")}
              hint={t("homepageVariantsDescription")}
              testId="hb-templates"
            >
              <div className={`${TEMPLATE_GRID} p-4`}>
                {variants.map((variant) => {
                  const text = variantText(tl, variant);
                  return (
                    <TemplateCard
                      key={variant.key}
                      name={text.name}
                      description={text.description}
                      sectionTypes={variant.section_types}
                      sectionCountLabel={t("sectionCount", { count: variant.section_count })}
                      applyLabel={t("applyVariant")}
                      onApply={() => setConfirmingVariant(variant)}
                    />
                  );
                })}
              </div>
            </SectionCard>
          )
        )}

        {/* Sections List */}
        <SectionCard title={t("sections")} hint={t("sectionsDescription")} testId="hb-sections">
          {isLoading ? (
            <div aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex min-h-14 items-center gap-3 border-b px-3 py-2 last:border-b-0">
                  <Skeleton className="h-10 w-7" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-48 max-w-full" />
                    <Skeleton className="h-3 w-64 max-w-full" />
                  </div>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <EcErrorState error={sectionsError} onRetry={() => refetchSections()} />
          ) : sections.length === 0 ? (
            <EcEmptyState
              icon={LayoutDashboard}
              title={t("emptyTitle")}
              description={t("noSections")}
              action={
                <button type="button" className={rdButton.primary} onClick={openAdd}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {t("addSection")}
                </button>
              }
            />
          ) : (
            <ul className="min-w-0">
              {sections.map((section, index) => {
                const title = sectionTitle(section.title, locale);
                return (
                  <SectionRow
                    key={section.id}
                    title={title}
                    typeLabel={sectionTypeLabel(tl, section.section_type, choices?.section_types)}
                    modeLabel={displayModeLabel(tl, section.display_mode, choices?.display_modes)}
                    meta={sectionMeta(section)}
                    active={!!section.is_active}
                    isFirst={index === 0}
                    isLast={index === sections.length - 1}
                    labels={{
                      moveUp: t("a11y.moveUp", { name: title }),
                      moveDown: t("a11y.moveDown", { name: title }),
                      toggle: t("a11y.toggleVisible", { name: title }),
                      edit: t("a11y.edit", { name: title }),
                      remove: t("a11y.delete", { name: title }),
                    }}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    onToggle={(checked) => toggleActive.mutate({ id: section.id, is_active: checked })}
                    onEdit={() => handleEdit(section)}
                    onDelete={() => setDeletingSection(section)}
                  />
                );
              })}
            </ul>
          )}
        </SectionCard>
      </EcPage>

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
                name: confirmingVariant ? variantText(tl, confirmingVariant).name : "",
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
              {applyVariant.isPending ? t("applying") : t("replaceAndGenerate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
