"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { TenantGroup, TenantGroupCreate, PaginatedTenantGroupList } from '../api/generated/interfaces';
import { tenantGroupsList, tenantGroupsCreate, tenantGroupsPartialUpdate, tenantGroupsDestroy } from '../api/generated/api';
import { PERMISSION_CATEGORIES } from '@/services/permissionService';
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

interface TenantGroupFormData extends Omit<TenantGroupCreate, 'name' | 'description'> {
  name: string;
  description: string;
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
    can_view_all_tickets: group?.can_view_all_tickets || false,
    can_manage_users: group?.can_manage_users || false,
    can_make_calls: group?.can_make_calls || false,
    can_manage_groups: group?.can_manage_groups || false,
    can_manage_settings: group?.can_manage_settings || false,
    can_create_tickets: group?.can_create_tickets || true, // Default to true
    can_edit_own_tickets: group?.can_edit_own_tickets || true, // Default to true
    can_edit_all_tickets: group?.can_edit_all_tickets || false,
    can_delete_tickets: group?.can_delete_tickets || false,
    can_assign_tickets: group?.can_assign_tickets || false,
    can_view_reports: group?.can_view_reports || false,
    can_export_data: group?.can_export_data || false,
    can_manage_tags: group?.can_manage_tags || false,
    can_manage_columns: group?.can_manage_columns || false,
    can_view_boards: group?.can_view_boards || true, // Default to true
    can_create_boards: group?.can_create_boards || false,
    can_edit_boards: group?.can_edit_boards || false,
    can_delete_boards: group?.can_delete_boards || false,
    can_access_orders: group?.can_access_orders || false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Map permission categories to form fields
  const permissionCategoryMapping = {
    'tickets': [
      'can_create_tickets',
      'can_edit_own_tickets', 
      'can_edit_all_tickets',
      'can_delete_tickets',
      'can_assign_tickets',
      'can_manage_tags',
      'can_manage_columns',
      'can_view_all_tickets'
    ],
    'orders': ['can_access_orders'],
    'calls': ['can_make_calls'],
    'user_management': ['can_manage_users', 'can_manage_groups', 'can_manage_settings'],
    'boards': ['can_view_boards', 'can_create_boards', 'can_edit_boards', 'can_delete_boards'],
    'reports': ['can_view_reports', 'can_export_data'],
  };

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    const permissions = permissionCategoryMapping[categoryId as keyof typeof permissionCategoryMapping];
    if (!permissions) return;

    setFormData(prev => {
      const updated = { ...prev };
      permissions.forEach(permission => {
        (updated as any)[permission] = checked;
      });
      return updated;
    });
  };

  const isCategoryChecked = (categoryId: string) => {
    const permissions = permissionCategoryMapping[categoryId as keyof typeof permissionCategoryMapping];
    if (!permissions) return false;
    
    return permissions.some(permission => (formData as any)[permission] === true);
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
              ? "Create a new group and assign permissions"
              : `Edit group "${group?.name}" and manage permissions`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
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
              placeholder="Enter group name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={isSubmitting}
              placeholder="Enter group description"
              rows={3}
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base">{t("permissions")}</Label>

            <div className="grid gap-4">
              {PERMISSION_CATEGORIES.map((category) => (
                <Card key={category.id} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={category.id}
                        checked={isCategoryChecked(category.id)}
                        onCheckedChange={(checked) => handleCategoryToggle(category.id, checked as boolean)}
                        disabled={isSubmitting}
                      />
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={category.id}
                          className="text-sm font-semibold cursor-pointer"
                        >
                          {category.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
            <Button type="submit" disabled={isSubmitting}>
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
  const [groups, setGroups] = useState<TenantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<{ mode: 'create' | 'edit'; group?: TenantGroup } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: PaginatedTenantGroupList = await tenantGroupsList();
      setGroups(response.results);
    } catch (err: any) {
      setError(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreateGroup = async (data: TenantGroupFormData) => {
    await tenantGroupsCreate(data as TenantGroupCreate);
    setShowForm(null);
    await loadGroups();
  };

  const handleUpdateGroup = async (data: TenantGroupFormData) => {
    if (!showForm?.group) return;
    await tenantGroupsPartialUpdate(showForm.group.id, data);
    setShowForm(null);
    await loadGroups();
  };

  const handleDeleteGroup = async (group: TenantGroup) => {
    if (window.confirm(`${t("areYouSureDelete")} "${group.name}"?`)) {
      try {
        await tenantGroupsDestroy(group.id);
        await loadGroups();
      } catch (err: any) {
        setError(err.message || tCommon("error"));
      }
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
            Manage tenant groups and their permissions
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
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {group.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
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