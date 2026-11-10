"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatShortDate } from "@/app/(tenant)/tickets/_lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useMyAccess } from "@/hooks/useMyAccess";
import { cn, getApiErrorMessage } from "@/lib/utils";
import { DataTable, type Column } from "@/components/redesign/data-table";
import { TonePill } from "@/components/redesign/pill";
import { rdButton } from "@/components/redesign/buttons";
import {
  ActionButton,
  FieldRow,
  SettingsNote,
  SettingsSection,
  SettingsToggle,
} from "@/components/redesign/settings";
import {
  useIPWhitelist,
  useCurrentIP,
  useCreateIPWhitelist,
  useUpdateIPWhitelist,
  useDeleteIPWhitelist,
  useToggleIPWhitelist,
} from "@/hooks/api/useSecurity";
import type { IPWhitelistEntry, IPWhitelistCreateRequest } from "@/types/security";

export function IPWhitelistTab() {
  const t = useTranslations('settings.security');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<IPWhitelistEntry | null>(null);
  const [formData, setFormData] = useState<IPWhitelistCreateRequest>({
    ip_address: "",
    cidr_notation: "",
    description: "",
    is_active: true,
  });

  const { data: whitelistData, isLoading } = useIPWhitelist();
  const { data: currentIPData } = useCurrentIP();
  const createMutation = useCreateIPWhitelist();
  const updateMutation = useUpdateIPWhitelist();
  const deleteMutation = useDeleteIPWhitelist();
  const toggleMutation = useToggleIPWhitelist();
  // Only a superuser may change the superadmin bypass (403 bypass_superuser_only).
  const { isSuperuser } = useMyAccess();

  const handleToggleWhitelist = async (enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ enabled });
      toast.success(enabled ? t('whitelist.enabledSuccess') : t('whitelist.disabledSuccess'));
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, t('whitelist.toggleError')));
    }
  };

  const handleToggleBypass = async (superadmin_bypass: boolean) => {
    try {
      await toggleMutation.mutateAsync({ superadmin_bypass });
      toast.success(t('whitelist.bypassUpdated'));
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, t('whitelist.toggleError')));
    }
  };

  const handleAddCurrentIP = () => {
    if (currentIPData) {
      setFormData({
        ip_address: currentIPData.ip_address,
        cidr_notation: "",
        description: currentIPData.city && currentIPData.country
          ? `${currentIPData.city}, ${currentIPData.country}`
          : "Current IP",
        is_active: true,
      });
      setIsAddDialogOpen(true);
    }
  };

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(formData);
      toast.success(t('whitelist.addSuccess'));
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, t('whitelist.addError')));
    }
  };

  const handleEdit = (entry: IPWhitelistEntry) => {
    setSelectedEntry(entry);
    setFormData({
      ip_address: entry.ip_address,
      cidr_notation: entry.cidr_notation || "",
      description: entry.description || "",
      is_active: entry.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedEntry) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedEntry.id,
        data: formData,
      });
      toast.success(t('whitelist.updateSuccess'));
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, t('whitelist.updateError')));
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    try {
      await deleteMutation.mutateAsync(selectedEntry.id);
      toast.success(t('whitelist.deleteSuccess'));
      setIsDeleteDialogOpen(false);
      setSelectedEntry(null);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, t('whitelist.deleteError')));
    }
  };

  const resetForm = () => {
    setFormData({
      ip_address: "",
      cidr_notation: "",
      description: "",
      is_active: true,
    });
    setSelectedEntry(null);
  };

  const openDeleteDialog = (entry: IPWhitelistEntry) => {
    setSelectedEntry(entry);
    setIsDeleteDialogOpen(true);
  };

  const columns: Column<IPWhitelistEntry>[] = [
    {
      id: "ip",
      header: t('whitelist.columns.ip'),
      width: "minmax(0,1.2fr)",
      mobile: "title",
      numeric: true,
      cell: (entry) => (
        <span className="truncate text-[13px]">
          {entry.ip_address}
          {entry.cidr_notation && `/${entry.cidr_notation}`}
        </span>
      ),
    },
    {
      id: "description",
      header: t('whitelist.columns.description'),
      width: "minmax(0,1.3fr)",
      mobile: "meta",
      cell: (entry) => entry.description ? <span className="truncate">{entry.description}</span> : <span className="text-muted-foreground">-</span>,
    },
    {
      id: "status",
      header: t('whitelist.columns.status'),
      width: "100px",
      mobile: "end",
      cell: (entry) => (
        <TonePill tone={entry.is_active ? "success" : "neutral"} dot>
          {entry.is_active ? t('whitelist.active') : t('whitelist.inactive')}
        </TonePill>
      ),
    },
    {
      id: "createdBy",
      header: t('whitelist.columns.createdBy'),
      width: "minmax(0,1.2fr)",
      mobile: "meta",
      cell: (entry) => entry.created_by_email ? <span className="truncate">{entry.created_by_email}</span> : <span className="text-muted-foreground">-</span>,
    },
    {
      id: "createdAt",
      header: t('whitelist.columns.createdAt'),
      width: "110px",
      mobile: "meta",
      muted: true,
      cell: (entry) => formatShortDate(entry.created_at, locale, { year: "always" }),
    },
    {
      id: "actions",
      header: <span className="sr-only">{t('whitelist.columns.actions')}</span>,
      width: "72px",
      align: "end",
      mobile: "actions",
      cell: (entry) => (
        <span className="flex items-center justify-end gap-1">
          <button
            type="button"
            className={rdButton.ghostIconSm}
            onClick={() => handleEdit(entry)}
            aria-label={`${tCommon('edit')} ${entry.ip_address}`}
            title={tCommon('edit')}
          >
            <Edit2 className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className={cn(rdButton.ghostIconSm, "text-destructive hover:text-destructive")}
            onClick={() => openDeleteDialog(entry)}
            aria-label={`${tCommon('delete')} ${entry.ip_address}`}
            title={tCommon('delete')}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Settings (toggles save instantly) */}
      <SettingsSection title={t('whitelist.settingsTitle')} hint={t('whitelist.settingsDescription')} testId="whitelist-settings">
        {isLoading ? (
          <div className="flex flex-col gap-3 px-4 py-3.5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            {/* Enable/Disable Whitelist */}
            <FieldRow label={t('whitelist.enableLabel')} help={t('whitelist.enableDescription')} htmlFor="whitelist-enabled" align="center">
              <SettingsToggle
                id="whitelist-enabled"
                checked={whitelistData?.ip_whitelist_enabled || false}
                onCheckedChange={handleToggleWhitelist}
                disabled={toggleMutation.isPending}
              />
            </FieldRow>

            {/* Superadmin Bypass */}
            <FieldRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  {t('whitelist.bypassLabel')}
                </span>
              }
              help={t('whitelist.bypassDescription')}
              htmlFor="whitelist-bypass"
              align="center"
            >
              <SettingsToggle
                id="whitelist-bypass"
                checked={whitelistData?.superadmin_bypass_whitelist || false}
                onCheckedChange={handleToggleBypass}
                disabled={toggleMutation.isPending || !isSuperuser}
              />
            </FieldRow>

            {/* Warning when enabled with no entries */}
            {whitelistData?.ip_whitelist_enabled && (!whitelistData.entries || whitelistData.entries.length === 0) && (
              <div className="px-4 py-3.5">
                <SettingsNote tone="warning" icon={AlertTriangle} testId="whitelist-no-entries">
                  {t('whitelist.noEntriesWarning')}
                </SettingsNote>
              </div>
            )}
          </>
        )}
      </SettingsSection>

      {/* Current IP Info */}
      {currentIPData && (
        <SettingsSection title={t('whitelist.yourCurrentIP')} testId="whitelist-current-ip">
          <FieldRow
            label={
              <span className="inline-flex items-center gap-1.5 font-mono text-[13px]">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {currentIPData.ip_address}
              </span>
            }
            help={currentIPData.city && currentIPData.country ? `${currentIPData.city}, ${currentIPData.country}` : undefined}
            align="center"
          >
            <ActionButton icon={Plus} onClick={handleAddCurrentIP} testId="whitelist-add-current">
              {t('whitelist.addCurrentIP')}
            </ActionButton>
          </FieldRow>
        </SettingsSection>
      )}

      {/* IP Whitelist Table */}
      <SettingsSection
        title={t('whitelist.entriesTitle')}
        hint={t('whitelist.entriesDescription')}
        actions={
          <button
            type="button"
            className={rdButton.primarySm}
            onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
            data-testid="whitelist-add"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t('whitelist.addEntry')}
          </button>
        }
        testId="whitelist-entries"
      >
        <DataTable<IPWhitelistEntry>
          variant="flush"
          density="comfortable"
          columns={columns}
          rows={isLoading ? undefined : whitelistData?.entries ?? []}
          loading={isLoading}
          rowKey={(entry) => entry.id}
          ariaLabel={t('whitelist.entriesTitle')}
          idPrefix="whitelist"
          skeletonRows={3}
          empty={<p className="py-8 text-center text-[13px] text-muted-foreground">{t('whitelist.noEntries')}</p>}
          renderError={() => null}
        />
      </SettingsSection>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('whitelist.addDialogTitle')}</DialogTitle>
            <DialogDescription>{t('whitelist.addDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('whitelist.ipAddress')}</Label>
              <Input
                placeholder="192.168.1.1"
                value={formData.ip_address}
                onChange={(e) => setFormData(prev => ({ ...prev, ip_address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('whitelist.cidr')} <span className="text-muted-foreground">({tCommon('optional')})</span></Label>
              <Input
                placeholder="24"
                value={formData.cidr_notation}
                onChange={(e) => setFormData(prev => ({ ...prev, cidr_notation: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{t('whitelist.cidrHelp')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('whitelist.description')} <span className="text-muted-foreground">({tCommon('optional')})</span></Label>
              <Input
                placeholder={t('whitelist.descriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">{t('whitelist.activeLabel')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !formData.ip_address}>
              {createMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {tCommon('saving')}
                </>
              ) : (
                t('whitelist.add')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('whitelist.editDialogTitle')}</DialogTitle>
            <DialogDescription>{t('whitelist.editDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('whitelist.ipAddress')}</Label>
              <Input
                placeholder="192.168.1.1"
                value={formData.ip_address}
                onChange={(e) => setFormData(prev => ({ ...prev, ip_address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('whitelist.cidr')} <span className="text-muted-foreground">({tCommon('optional')})</span></Label>
              <Input
                placeholder="24"
                value={formData.cidr_notation}
                onChange={(e) => setFormData(prev => ({ ...prev, cidr_notation: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('whitelist.description')} <span className="text-muted-foreground">({tCommon('optional')})</span></Label>
              <Input
                placeholder={t('whitelist.descriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="edit_is_active">{t('whitelist.activeLabel')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending || !formData.ip_address}>
              {updateMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {tCommon('saving')}
                </>
              ) : (
                tCommon('save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('whitelist.deleteDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('whitelist.deleteDialogDescription', {
                ip: selectedEntry?.ip_address || '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {tCommon('deleting')}
                </>
              ) : (
                tCommon('delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
