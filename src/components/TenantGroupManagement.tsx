"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { TenantGroup } from '../api/generated/interfaces';
import axios from '@/api/axios';
import {
  useTenantGroups,
  useCreateTenantGroup,
  useUpdateTenantGroup,
  useDeleteTenantGroup
} from '@/hooks/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, Users, XCircle } from "lucide-react";

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
        const response = await axios.get<AvailableFeaturesResponse>('/api/tenant-groups/available_features/');
        setAvailableFeatures(response.data.categories);
      } catch (err) {
        console.error('Failed to fetch available features:', err);
        setErrors({ fetch: 'Failed to load available features' });
      } finally {
        setLoadingFeatures(false);
      }
    };

    if (open) {
      fetchFeatures();
    }
  }, [open]);

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
      setErrors({ submit: err.message || "Failed to save group" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("createNewGroup") : t("editGroup")}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "შექმენით ახალი ჯგუფი და მიამაგრეთ ფუნქციები"
              : `რედაქტირება ჯგუფი "${group?.name}" და ფუნქციების მართვა`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {errors.fetch && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{errors.fetch}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{t("groupName")} *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              disabled={isSubmitting}
              placeholder="შეიყვანეთ ჯგუფის სახელი"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={isSubmitting}
              placeholder="შეიყვანეთ ჯგუფის აღწერა"
              rows={3}
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base">ფუნქციები</Label>
            <p className="text-sm text-muted-foreground">
              აირჩიეთ ფუნქციები თქვენი გამოწერიდან, რომლებიც ხელმისაწვდომი იქნება ამ ჯგუფის წევრებისთვის
            </p>

            {loadingFeatures ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-6 w-6 mr-2" />
                <span className="text-sm text-muted-foreground">ფუნქციების ჩატვირთვა...</span>
              </div>
            ) : availableFeatures.length === 0 ? (
              <Alert>
                <AlertDescription>
                  თქვენს გამოწერაში ხელმისაწვდომი ფუნქციები არ მოიძებნა
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                {availableFeatures.map((category) => (
                  <Card key={category.category} className="bg-muted/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={category.category}
                          checked={isCategoryChecked(category)}
                          onCheckedChange={(checked) => handleCategoryToggle(category, checked as boolean)}
                          disabled={isSubmitting}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={category.category}
                            className="text-sm font-semibold cursor-pointer"
                          >
                            {category.category_display}
                          </Label>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {category.features.map((feature) => (
                        <div key={feature.id} className="flex items-start space-x-3 pl-6">
                          <Checkbox
                            id={`feature-${feature.id}`}
                            checked={isFeatureChecked(feature.id)}
                            onCheckedChange={(checked) => handleFeatureToggle(feature.id, checked as boolean)}
                            disabled={isSubmitting}
                          />
                          <div className="flex-1 space-y-1">
                            <Label
                              htmlFor={`feature-${feature.id}`}
                              className="text-sm cursor-pointer font-normal"
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || loadingFeatures}>
              {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              {isSubmitting ? t("saving") : mode === "create" ? t("createGroup") : t("updateGroup")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TenantGroupManagement: React.FC = () => {
  const t = useTranslations("groups");
  const tCommon = useTranslations("common");
  const [showForm, setShowForm] = useState<{ mode: 'create' | 'edit'; group?: TenantGroup } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Use React Query hooks
  const { data: groupsData, isLoading: loading, error: queryError } = useTenantGroups();
  const createGroup = useCreateTenantGroup();
  const updateGroup = useUpdateTenantGroup();
  const deleteGroupMutation = useDeleteTenantGroup();

  const groups = groupsData?.results || [];
  const error = queryError ? "Failed to load groups" : null;

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
      await deleteGroupMutation.mutateAsync(group.id.toString());
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Spinner className="h-8 w-8" />
          <span className="text-muted-foreground">{tCommon("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">{t("groupManagement")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            მართეთ ჯგუფები და მათი ფუნქციები
          </p>
        </div>
        <Button onClick={() => setShowForm({ mode: 'create' })}>
          <Plus className="h-4 w-4 mr-2" />
          {t("createNewGroup")}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t("searchGroups")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Groups List */}
      <Card>
        <CardContent className="p-0">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? t("noGroupsMatch") : t("noGroupsFound")}
            </div>
          ) : (
            <div className="divide-y">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="p-4 flex justify-between items-start hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">{group.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {group.member_count}
                      </Badge>
                      {group.features && group.features.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {group.features.length} ფუნქცია
                        </Badge>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {group.description}
                      </p>
                    )}
                    {group.features && group.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {group.features.slice(0, 5).map((feature) => (
                          <Badge key={feature.id} variant="secondary" className="text-xs">
                            {feature.icon && <span className="mr-1">{feature.icon}</span>}
                            {feature.name}
                          </Badge>
                        ))}
                        {group.features.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{group.features.length - 5} მეტი
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("created")} {new Date(group.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowForm({ mode: 'edit', group })}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {tCommon("edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteGroup(group)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {tCommon("delete")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <TenantGroupForm
        mode={showForm?.mode || 'create'}
        group={showForm?.group}
        open={showForm !== null}
        onSubmit={showForm?.mode === 'create' ? handleCreateGroup : handleUpdateGroup}
        onClose={() => setShowForm(null)}
      />
    </div>
  );
};

export default TenantGroupManagement;
