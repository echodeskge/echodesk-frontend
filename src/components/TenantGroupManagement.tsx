"use client";

import React, { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { TenantGroup } from '../api/generated/interfaces';
import axios from '@/api/axios';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/utils';
import {
  useTenantGroups,
  useCreateTenantGroup,
  useUpdateTenantGroup,
  useDeleteTenantGroup
} from '@/hooks/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import type { Column } from "@/components/redesign/data-table";
import { EmptyBlock } from "@/components/redesign/states";
import { TonePill } from "@/components/redesign/pill";
import { rdButton } from "@/components/redesign/buttons";
import { ToolbarSearch } from "@/components/redesign/toolbar";
import { SettingsListPage, SettingsNote } from "@/components/redesign/settings";
import { settingsDialogFormClass, settingsDialogSectionTitle } from "@/components/user-management/dialog-ui";
import { cn } from "@/lib/utils";
import { Pencil, Plus, Trash2, Users, UsersRound } from "lucide-react";

interface Feature {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
}

interface FeatureCategory {
  category: string;
  category_display: string;
  features: Feature[];
}

interface AvailableFeaturesResponse {
  categories: FeatureCategory[];
}

interface TenantGroupFormData {
  name: string;
  description: string;
  feature_ids?: number[];
}

interface TenantGroupFormProps {
  mode: 'create' | 'edit';
  group?: TenantGroup;
  open: boolean;
  onSubmit: (data: TenantGroupFormData) => Promise<void>;
  onClose: () => void;
}

const TenantGroupForm: React.FC<TenantGroupFormProps> = ({ mode, group, open, onSubmit, onClose }) => {
  const t = useTranslations("groups");
  const tCommon = useTranslations("common");
  const [formData, setFormData] = useState<TenantGroupFormData>({
    name: group?.name || '',
    description: group?.description || '',
    feature_ids: group?.features?.map(f => f.id) || [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [availableFeatures, setAvailableFeatures] = useState<FeatureCategory[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(true);

  // Fetch available features
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        setLoadingFeatures(true);
        // Include group_id when editing to show features already assigned to the group
        const url = mode === 'edit' && group?.id
          ? `/api/tenant-groups/available_features/?group_id=${group.id}`
          : '/api/tenant-groups/available_features/';
        const response = await axios.get<AvailableFeaturesResponse>(url);
        setAvailableFeatures(response.data.categories);
      } catch (err) {
        console.error('Failed to fetch available features:', err);
        setErrors({ fetch: t("ui.errors.loadFeatures") });
      } finally {
        setLoadingFeatures(false);
      }
    };

    if (open) {
      fetchFeatures();
    }
    // `t` is left out on purpose: a locale change must not refetch the feature list (same requests as before).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, group?.id]);

  // Reset form data when group changes
  useEffect(() => {
    setFormData({
      name: group?.name || '',
      description: group?.description || '',
      feature_ids: group?.features?.map(f => f.id) || [],
    });
  }, [group]);

  const handleFeatureToggle = (featureId: number, checked: boolean) => {
    setFormData(prev => {
      const currentIds = prev.feature_ids || [];
      const updatedIds = checked
        ? [...currentIds, featureId]
        : currentIds.filter(id => id !== featureId);
      return {
        ...prev,
        feature_ids: updatedIds,
      };
    });
  };

  const handleCategoryToggle = (category: FeatureCategory, checked: boolean) => {
    setFormData(prev => {
      const currentIds = prev.feature_ids || [];
      const categoryFeatureIds = category.features.map(f => f.id);

      let updatedIds: number[];
      if (checked) {
        // Add all features from this category
        updatedIds = [...new Set([...currentIds, ...categoryFeatureIds])];
      } else {
        // Remove all features from this category
        updatedIds = currentIds.filter(id => !categoryFeatureIds.includes(id));
      }

      return {
        ...prev,
        feature_ids: updatedIds,
      };
    });
  };

  const isCategoryChecked = (category: FeatureCategory) => {
    const currentIds = formData.feature_ids || [];
    return category.features.some(f => currentIds.includes(f.id));
  };

  const isFeatureChecked = (featureId: number) => {
    return (formData.feature_ids || []).includes(featureId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (err: any) {
      // The backend reason (e.g. a duplicate name), not axios' "Request failed with status code 400".
      setErrors({ submit: getApiErrorMessage(err, t("ui.errors.save")) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[17px]">
            {mode === "create" ? t("createNewGroup") : t("editGroup")}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {mode === "create"
              ? t("ui.createDescription")
              : t("ui.editDescription", { name: group?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className={cn("space-y-5", settingsDialogFormClass)}>
          {errors.submit && <SettingsNote tone="danger">{errors.submit}</SettingsNote>}

          {errors.fetch && <SettingsNote tone="danger">{errors.fetch}</SettingsNote>}

          <div className="space-y-2">
            <Label htmlFor="name">{t("groupName")} *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              disabled={isSubmitting}
              placeholder={t("ui.namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={isSubmitting}
              placeholder={t("ui.descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex flex-col gap-0.5">
              <h3 className={settingsDialogSectionTitle}>{t("ui.features")}</h3>
              <p className="text-xs text-muted-foreground">{t("ui.featuresHint")}</p>
            </div>

            {loadingFeatures ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-6 w-6 mr-2" />
                <span className="text-sm text-muted-foreground">{t("ui.loadingFeatures")}</span>
              </div>
            ) : availableFeatures.length === 0 ? (
              <SettingsNote tone="neutral">{t("ui.noFeatures")}</SettingsNote>
            ) : (
              <div className="grid gap-3">
                {availableFeatures.map((category) => (
                  <section key={category.category} className="overflow-hidden rounded-[10px] border">
                    <div className="border-b bg-muted/35 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={category.category}
                          checked={isCategoryChecked(category)}
                          onCheckedChange={(checked) => handleCategoryToggle(category, checked as boolean)}
                          disabled={isSubmitting}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={category.category}
                            className="cursor-pointer font-semibold"
                          >
                            {category.category_display}
                          </Label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2.5 px-4 py-3">
                      {category.features.map((feature) => (
                        <div key={feature.id} className="flex items-start gap-3 ps-6">
                          <Checkbox
                            id={`feature-${feature.id}`}
                            checked={isFeatureChecked(feature.id)}
                            onCheckedChange={(checked) => handleFeatureToggle(feature.id, checked as boolean)}
                            disabled={isSubmitting}
                          />
                          <div className="flex-1 space-y-1">
                            <Label
                              htmlFor={`feature-${feature.id}`}
                              className="cursor-pointer font-normal"
                            >
                              {feature.icon && <span className="mr-2">{feature.icon}</span>}
                              {feature.name}
                            </Label>
                            {feature.description && (
                              <p className="text-xs text-muted-foreground">
                                {feature.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <button
              type="button"
              className={rdButton.outline}
              onClick={onClose}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </button>
            <button type="submit" className={rdButton.primary} disabled={isSubmitting || loadingFeatures}>
              {isSubmitting && <Spinner className="h-3.5 w-3.5" />}
              {isSubmitting ? t("saving") : mode === "create" ? t("createGroup") : t("updateGroup")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TenantGroupManagement: React.FC = () => {
  const t = useTranslations("groups");
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const [showForm, setShowForm] = useState<{ mode: 'create' | 'edit'; group?: TenantGroup } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Use React Query hooks
  const { data: groupsData, isLoading: loading, error: queryError } = useTenantGroups();
  const createGroup = useCreateTenantGroup();
  const updateGroup = useUpdateTenantGroup();
  const deleteGroupMutation = useDeleteTenantGroup();

  const groups = groupsData?.results || [];
  const error = queryError ? t("ui.errors.load") : null;

  const handleCreateGroup = async (data: TenantGroupFormData) => {
    await createGroup.mutateAsync(data as any);
    setShowForm(null);
  };

  const handleUpdateGroup = async (data: TenantGroupFormData) => {
    if (!showForm?.group) return;
    await updateGroup.mutateAsync({ id: showForm.group.id.toString(), data: data as any });
    setShowForm(null);
  };

  const handleDeleteGroup = async (group: TenantGroup) => {
    if (window.confirm(`${t("areYouSureDelete")} "${group.name}"?`)) {
      try {
        await deleteGroupMutation.mutateAsync(group.id.toString());
      } catch (err) {
        // Was an unhandled rejection: a refused delete showed nothing.
        toast.error(getApiErrorMessage(err, t("ui.errors.delete")));
      }
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale === "ka" ? "ka-GE" : "en-US");

  const columns: Column<TenantGroup>[] = [
    {
      id: "group",
      header: t("ui.columns.group"),
      width: "minmax(0,1.4fr)",
      mobile: "title",
      cell: (group) => (
        <span className="flex min-w-0 items-start gap-2 py-1">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-primary/10 text-primary"
          >
            <UsersRound className="h-3.5 w-3.5" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium">{group.name}</span>
            {/* The full description, as before (it wraps instead of being cut). */}
            {group.description && (
              <span className="whitespace-normal break-words text-[11px] leading-[15px] text-muted-foreground">
                {group.description}
              </span>
            )}
            {(group.is_booking_staff || group.is_active === false) && (
              <span className="mt-0.5 flex flex-wrap gap-1">
                {group.is_booking_staff && <TonePill tone="info">{t("ui.bookingStaff")}</TonePill>}
                {group.is_active === false && <TonePill tone="neutral">{t("ui.inactive")}</TonePill>}
              </span>
            )}
          </span>
        </span>
      ),
    },
    {
      id: "members",
      header: t("ui.columns.members"),
      width: "84px",
      mobile: "end",
      cell: (group) => (
        <span
          className="inline-flex items-center gap-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground"
          title={t("ui.membersCount", { count: group.member_count })}
        >
          <Users className="h-3.5 w-3.5" aria-hidden />
          {group.member_count}
        </span>
      ),
    },
    {
      id: "features",
      header: t("ui.columns.features"),
      width: "minmax(0,1.7fr)",
      mobile: "meta",
      // Phones: the chips wrap inside line 2 instead of running past the card edge.
      className: "max-w-full shrink",
      cell: (group) =>
        group.features && group.features.length > 0 ? (
          <span className="flex min-w-0 flex-wrap items-center gap-1 py-1">
            <span className="me-1 whitespace-nowrap text-xs text-muted-foreground">
              {t("ui.featureCount", { count: group.features.length })}
            </span>
            {group.features.slice(0, 5).map((feature) => (
              <TonePill key={feature.id} tone="neutral">
                {feature.icon ? `${feature.icon} ${feature.name}` : feature.name}
              </TonePill>
            ))}
            {group.features.length > 5 && (
              <TonePill tone="neutral">{t("ui.moreFeatures", { count: group.features.length - 5 })}</TonePill>
            )}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "created",
      header: t("ui.columns.created"),
      width: "104px",
      mobile: "meta",
      muted: true,
      cell: (group) => (
        <span className="whitespace-nowrap">
          <span className="@3xl:hidden">{t("created")} </span>
          {fmtDate(group.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">{t("management.actions")}</span>,
      width: "64px",
      align: "end",
      mobile: "actions",
      cell: (group) => (
        <span className="flex items-center gap-0.5">
          <button
            type="button"
            className={rdButton.ghostIconSm}
            onClick={() => setShowForm({ mode: 'edit', group })}
            title={tCommon("edit")}
            aria-label={tCommon("edit")}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className={cn(rdButton.ghostIconSm, "text-destructive hover:bg-destructive/10 hover:text-destructive")}
            onClick={() => handleDeleteGroup(group)}
            title={tCommon("delete")}
            aria-label={tCommon("delete")}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ),
    },
  ];

  return (
    <SettingsListPage
      icon={UsersRound}
      title={t("groupManagement")}
      description={t("ui.subtitle")}
      newAction={{ label: t("createNewGroup"), icon: Plus, onClick: () => setShowForm({ mode: 'create' }), testId: "groups-new" }}
      columns={columns}
      rows={loading ? undefined : filteredGroups}
      rowKey={(group) => group.id}
      onRowClick={(group) => setShowForm({ mode: 'edit', group })}
      loading={loading}
      renderError={() => null}
      empty={
        <EmptyBlock
          icon={UsersRound}
          title={searchTerm ? t("noGroupsMatch") : t("noGroupsFound")}
          testId="groups-empty"
        />
      }
      countLabel={t("ui.countLine", { count: filteredGroups.length })}
      ariaLabel={t("groupManagement")}
      idPrefix="groups"
      testId="settings-groups"
      before={
        <>
          {/* Search */}
          <ToolbarSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("searchGroups")}
            clearLabel={t("ui.clearSearch")}
            className="max-w-none sm:max-w-[320px]"
            testId="groups-search"
          />

          {/* Error Alert */}
          {error && <SettingsNote tone="danger">{error}</SettingsNote>}
        </>
      }
    >
      {/* Form Dialog */}
      <TenantGroupForm
        mode={showForm?.mode || 'create'}
        group={showForm?.group}
        open={showForm !== null}
        onSubmit={showForm?.mode === 'create' ? handleCreateGroup : handleUpdateGroup}
        onClose={() => setShowForm(null)}
      />
    </SettingsListPage>
  );
};

export default TenantGroupManagement;
