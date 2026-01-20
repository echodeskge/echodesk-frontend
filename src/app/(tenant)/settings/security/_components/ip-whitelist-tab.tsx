"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Globe,
  Shield,
  ShieldCheck,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
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

  const handleToggleWhitelist = async (enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ enabled });
      toast.success(enabled ? t('whitelist.enabledSuccess') : t('whitelist.disabledSuccess'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('whitelist.toggleError'));
    }
  };

  const handleToggleBypass = async (superadmin_bypass: boolean) => {
    try {
      await toggleMutation.mutateAsync({ superadmin_bypass });
      toast.success(t('whitelist.bypassUpdated'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('whitelist.toggleError'));
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
      toast.error(error.response?.data?.error || t('whitelist.addError'));
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
      toast.error(error.response?.data?.error || t('whitelist.updateError'));
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
      toast.error(error.response?.data?.error || t('whitelist.deleteError'));
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

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('whitelist.settingsTitle')}
          </CardTitle>
          <CardDescription>{t('whitelist.settingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              {/* Enable/Disable Whitelist */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('whitelist.enableLabel')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('whitelist.enableDescription')}
                  </p>
                </div>
                <Switch
                  checked={whitelistData?.ip_whitelist_enabled || false}
                  onCheckedChange={handleToggleWhitelist}
                  disabled={toggleMutation.isPending}
                />
              </div>

              {/* Superadmin Bypass */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {t('whitelist.bypassLabel')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('whitelist.bypassDescription')}
                  </p>
                </div>
                <Switch
                  checked={whitelistData?.superadmin_bypass_whitelist || false}
                  onCheckedChange={handleToggleBypass}
                  disabled={toggleMutation.isPending}
                />
              </div>

              {/* Warning when enabled with no entries */}
              {whitelistData?.ip_whitelist_enabled && (!whitelistData.entries || whitelistData.entries.length === 0) && (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="text-sm">{t('whitelist.noEntriesWarning')}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Current IP Info */}
      {currentIPData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t('whitelist.yourCurrentIP')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <code className="text-lg font-mono bg-muted px-2 py-1 rounded">
                  {currentIPData.ip_address}
                </code>
                {currentIPData.city && currentIPData.country && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentIPData.city}, {currentIPData.country}
                  </p>
                )}
              </div>
              <Button onClick={handleAddCurrentIP} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('whitelist.addCurrentIP')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* IP Whitelist Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('whitelist.entriesTitle')}
              </CardTitle>
              <CardDescription>{t('whitelist.entriesDescription')}</CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('whitelist.addEntry')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('whitelist.columns.ip')}</TableHead>
                  <TableHead>{t('whitelist.columns.description')}</TableHead>
                  <TableHead>{t('whitelist.columns.status')}</TableHead>
                  <TableHead>{t('whitelist.columns.createdBy')}</TableHead>
                  <TableHead>{t('whitelist.columns.createdAt')}</TableHead>
                  <TableHead className="text-right">{t('whitelist.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : whitelistData?.entries?.length ? (
                  whitelistData.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                          {entry.ip_address}
                          {entry.cidr_notation && `/${entry.cidr_notation}`}
                        </code>
                      </TableCell>
                      <TableCell>
                        {entry.description || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.is_active ? "default" : "secondary"}>
                          {entry.is_active ? t('whitelist.active') : t('whitelist.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entry.created_by_email || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(entry)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('whitelist.noEntries')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
              <Label>{t('whitelist.cidr')} <span className="text-muted-foreground">({t('common.optional')})</span></Label>
              <Input
                placeholder="24"
                value={formData.cidr_notation}
                onChange={(e) => setFormData(prev => ({ ...prev, cidr_notation: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{t('whitelist.cidrHelp')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('whitelist.description')} <span className="text-muted-foreground">({t('common.optional')})</span></Label>
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
                  {t('common.saving')}
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
              <Label>{t('whitelist.cidr')} <span className="text-muted-foreground">({t('common.optional')})</span></Label>
              <Input
                placeholder="24"
                value={formData.cidr_notation}
                onChange={(e) => setFormData(prev => ({ ...prev, cidr_notation: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('whitelist.description')} <span className="text-muted-foreground">({t('common.optional')})</span></Label>
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
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
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
                  {t('common.deleting')}
                </>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
