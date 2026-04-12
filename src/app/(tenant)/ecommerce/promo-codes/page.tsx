"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ecommerceAdminPromoCodesList,
  ecommerceAdminPromoCodesCreate,
  ecommerceAdminPromoCodesUpdate,
  ecommerceAdminPromoCodesDestroy,
} from "@/api/generated";
import type { PromoCode, PromoCodeRequest } from "@/api/generated/interfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Plus, Pencil, Trash2, Tag, Search } from "lucide-react";

const EMPTY_FORM: PromoCodeRequest = {
  code: "",
  discount_type: "percentage" as unknown as PromoCodeRequest["discount_type"],
  discount_value: "0",
  min_order_amount: "",
  max_uses: undefined,
  valid_from: "",
  valid_until: "",
  is_active: true,
};

export default function PromoCodesPage() {
  const t = useTranslations("promoCodes");

  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoCodeRequest>({ ...EMPTY_FORM });

  const [deletingCode, setDeletingCode] = useState<PromoCode | null>(null);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const response = await ecommerceAdminPromoCodesList();
      setCodes(response.results || []);
    } catch {
      toast.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const isExpired = (code: PromoCode): boolean => {
    return new Date(code.valid_until) < new Date();
  };

  const isMaxedOut = (code: PromoCode): boolean => {
    return code.max_uses !== undefined && code.max_uses !== null && code.times_used >= code.max_uses;
  };

  const getStatusBadge = (code: PromoCode) => {
    if (!code.is_active) {
      return <Badge variant="secondary">{t("inactive")}</Badge>;
    }
    if (isExpired(code)) {
      return <Badge variant="destructive">{t("expired")}</Badge>;
    }
    if (isMaxedOut(code)) {
      return <Badge variant="outline">{t("maxedOut")}</Badge>;
    }
    return <Badge variant="default">{t("active")}</Badge>;
  };

  const filteredCodes = codes.filter((code) => {
    const matchesSearch =
      !searchQuery ||
      code.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      typeFilter === "all" || String(code.discount_type) === typeFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && code.is_active && !isExpired(code) && !isMaxedOut(code)) ||
      (statusFilter === "inactive" && !code.is_active) ||
      (statusFilter === "expired" && isExpired(code));

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAdd = () => {
    setEditingCode(null);
    setForm({ ...EMPTY_FORM });
    setSheetOpen(true);
  };

  const handleEdit = (code: PromoCode) => {
    setEditingCode(code);
    setForm({
      code: code.code,
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      min_order_amount: code.min_order_amount || "",
      max_uses: code.max_uses,
      valid_from: code.valid_from ? code.valid_from.slice(0, 16) : "",
      valid_until: code.valid_until ? code.valid_until.slice(0, 16) : "",
      is_active: code.is_active ?? true,
    });
    setSheetOpen(true);
  };

  const validateForm = (): boolean => {
    if (!form.code.trim()) {
      toast.error(t("validation.codeRequired"));
      return false;
    }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      toast.error(t("validation.discountValuePositive"));
      return false;
    }
    if (form.valid_from && form.valid_until) {
      if (new Date(form.valid_from) >= new Date(form.valid_until)) {
        toast.error(t("validation.validFromBeforeUntil"));
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      const payload = {
        ...form,
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : "",
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : "",
      };
      if (editingCode) {
        await ecommerceAdminPromoCodesUpdate(editingCode.id, payload);
        toast.success(t("updateSuccess"));
      } else {
        await ecommerceAdminPromoCodesCreate(payload);
        toast.success(t("createSuccess"));
      }
      setSheetOpen(false);
      fetchCodes();
    } catch {
      toast.error(editingCode ? t("updateError") : t("createError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCode) return;
    try {
      await ecommerceAdminPromoCodesDestroy(deletingCode.id);
      toast.success(t("deleteSuccess"));
      setDeletingCode(null);
      fetchCodes();
    } catch {
      toast.error(t("deleteError"));
    }
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setEditingCode(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
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
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Button className="gap-2" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          {t("addCode")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>{t("codesTitle")}</CardTitle>
              <CardDescription>
                {t("codesFound", { count: filteredCodes.length })}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t("filterByType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("types.all")}</SelectItem>
                  <SelectItem value="fixed">{t("types.fixed")}</SelectItem>
                  <SelectItem value="percentage">{t("types.percentage")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t("filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("statuses.all")}</SelectItem>
                  <SelectItem value="active">{t("statuses.active")}</SelectItem>
                  <SelectItem value="inactive">{t("statuses.inactive")}</SelectItem>
                  <SelectItem value="expired">{t("statuses.expired")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCodes.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("emptyTitle")}</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                  ? t("emptyFiltered")
                  : t("emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.code")}</TableHead>
                    <TableHead>{t("table.type")}</TableHead>
                    <TableHead>{t("table.value")}</TableHead>
                    <TableHead>{t("table.minOrder")}</TableHead>
                    <TableHead>{t("table.usage")}</TableHead>
                    <TableHead>{t("table.validFrom")}</TableHead>
                    <TableHead>{t("table.validUntil")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-medium">
                        {code.code}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {String(code.discount_type) === "percentage"
                            ? t("types.percentage")
                            : t("types.fixed")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {String(code.discount_type) === "percentage"
                          ? `${code.discount_value}%`
                          : `${parseFloat(code.discount_value).toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        {code.min_order_amount
                          ? `${parseFloat(code.min_order_amount).toFixed(2)}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {code.times_used}
                        {code.max_uses !== undefined && code.max_uses !== null
                          ? ` / ${code.max_uses}`
                          : ""}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(code.valid_from)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(code.valid_until)}
                      </TableCell>
                      <TableCell>{getStatusBadge(code)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(code)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingCode(code)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingCode ? t("editCode") : t("addCode")}
            </SheetTitle>
            <SheetDescription>
              {editingCode ? t("editCodeDesc") : t("addCodeDesc")}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="promo-code">{t("form.code")}</Label>
              <Input
                id="promo-code"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="SUMMER2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-discount-type">{t("form.discountType")}</Label>
              <Select
                value={String(form.discount_type)}
                onValueChange={(val) =>
                  setForm({
                    ...form,
                    discount_type: val as unknown as PromoCodeRequest["discount_type"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t("types.percentage")}</SelectItem>
                  <SelectItem value="fixed">{t("types.fixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-discount-value">{t("form.discountValue")}</Label>
              <Input
                id="promo-discount-value"
                type="number"
                step="0.01"
                min="0"
                value={form.discount_value}
                onChange={(e) =>
                  setForm({ ...form, discount_value: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-min-order">{t("form.minOrderAmount")}</Label>
              <Input
                id="promo-min-order"
                type="number"
                step="0.01"
                min="0"
                value={form.min_order_amount || ""}
                onChange={(e) =>
                  setForm({ ...form, min_order_amount: e.target.value })
                }
                placeholder={t("form.minOrderPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-max-uses">{t("form.maxUses")}</Label>
              <Input
                id="promo-max-uses"
                type="number"
                min="0"
                value={form.max_uses ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    max_uses: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder={t("form.maxUsesPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-valid-from">{t("form.validFrom")}</Label>
              <Input
                id="promo-valid-from"
                type="datetime-local"
                value={form.valid_from ? form.valid_from.slice(0, 16) : ""}
                onChange={(e) =>
                  setForm({ ...form, valid_from: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-valid-until">{t("form.validUntil")}</Label>
              <Input
                id="promo-valid-until"
                type="datetime-local"
                value={form.valid_until ? form.valid_until.slice(0, 16) : ""}
                onChange={(e) =>
                  setForm({ ...form, valid_until: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="promo-is-active"
                checked={form.is_active ?? true}
                onCheckedChange={(checked) =>
                  setForm({ ...form, is_active: checked })
                }
              />
              <Label htmlFor="promo-is-active">{t("form.isActive")}</Label>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={handleCloseSheet}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("saving") : t("save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingCode}
        onOpenChange={(open) => !open && setDeletingCode(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", {
                code: deletingCode?.code || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
