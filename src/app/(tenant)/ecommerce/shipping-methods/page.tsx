"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ecommerceAdminShippingMethodsList,
  ecommerceAdminShippingMethodsCreate,
  ecommerceAdminShippingMethodsUpdate,
  ecommerceAdminShippingMethodsDestroy,
} from "@/api/generated";
import type { ShippingMethod, ShippingMethodRequest } from "@/api/generated/interfaces";
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
import { Plus, Pencil, Trash2, Truck } from "lucide-react";

const EMPTY_FORM: ShippingMethodRequest = {
  name: { en: "", ka: "" },
  description: { en: "", ka: "" },
  price: "0.00",
  free_shipping_threshold: "",
  is_active: true,
  estimated_days: 1,
  position: 0,
};

export default function ShippingMethodsPage() {
  const t = useTranslations("shippingMethods");

  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);
  const [form, setForm] = useState<ShippingMethodRequest>({ ...EMPTY_FORM });

  const [deletingMethod, setDeletingMethod] = useState<ShippingMethod | null>(null);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const response = await ecommerceAdminShippingMethodsList();
      setMethods(response.results || []);
    } catch {
      toast.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const getName = (method: ShippingMethod): string => {
    if (typeof method.name === "object" && method.name !== null) {
      return method.name.en || method.name.ka || "";
    }
    return String(method.name || "");
  };

  const handleAdd = () => {
    setEditingMethod(null);
    setForm({ ...EMPTY_FORM });
    setSheetOpen(true);
  };

  const handleEdit = (method: ShippingMethod) => {
    setEditingMethod(method);
    setForm({
      name: method.name ?? { en: "", ka: "" },
      description: method.description ?? { en: "", ka: "" },
      price: method.price || "0.00",
      free_shipping_threshold: method.free_shipping_threshold || "",
      is_active: method.is_active ?? true,
      estimated_days: method.estimated_days ?? 1,
      position: method.position ?? 0,
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingMethod) {
        await ecommerceAdminShippingMethodsUpdate(editingMethod.id, form);
        toast.success(t("updateSuccess"));
      } else {
        await ecommerceAdminShippingMethodsCreate(form);
        toast.success(t("createSuccess"));
      }
      setSheetOpen(false);
      fetchMethods();
    } catch {
      toast.error(editingMethod ? t("updateError") : t("createError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMethod) return;
    try {
      await ecommerceAdminShippingMethodsDestroy(deletingMethod.id);
      toast.success(t("deleteSuccess"));
      setDeletingMethod(null);
      fetchMethods();
    } catch {
      toast.error(t("deleteError"));
    }
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setEditingMethod(null);
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
          {t("addMethod")}
        </Button>
      </div>

      {/* Table */}
      {methods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <Truck className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("emptyTitle")}</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {t("emptyDescription")}
            </p>
            <Button className="gap-2" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              {t("addFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("tableTitle")}</CardTitle>
            <CardDescription>
              {t("totalMethods", { count: methods.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.name")}</TableHead>
                  <TableHead>{t("table.price")}</TableHead>
                  <TableHead>{t("table.estimatedDays")}</TableHead>
                  <TableHead>{t("table.freeThreshold")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead className="text-right">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium">{getName(method)}</TableCell>
                    <TableCell>{method.price ? `${parseFloat(method.price).toFixed(2)}` : "-"}</TableCell>
                    <TableCell>
                      {method.estimated_days
                        ? t("daysCount", { count: method.estimated_days })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {method.free_shipping_threshold
                        ? `${parseFloat(method.free_shipping_threshold).toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {method.is_active ? (
                        <Badge variant="default">{t("active")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("inactive")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(method)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingMethod(method)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingMethod ? t("editMethod") : t("addMethod")}
            </SheetTitle>
            <SheetDescription>
              {editingMethod ? t("editMethodDesc") : t("addMethodDesc")}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="shipping-name-en">{t("form.nameEn")}</Label>
              <Input
                id="shipping-name-en"
                value={typeof form.name === "object" ? form.name?.en || "" : form.name || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: {
                      ...(typeof form.name === "object" ? form.name : {}),
                      en: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping-name-ka">{t("form.nameKa")}</Label>
              <Input
                id="shipping-name-ka"
                value={typeof form.name === "object" ? form.name?.ka || "" : ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: {
                      ...(typeof form.name === "object" ? form.name : {}),
                      ka: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping-desc-en">{t("form.descriptionEn")}</Label>
              <Input
                id="shipping-desc-en"
                value={
                  typeof form.description === "object"
                    ? form.description?.en || ""
                    : form.description || ""
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: {
                      ...(typeof form.description === "object" ? form.description : {}),
                      en: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping-desc-ka">{t("form.descriptionKa")}</Label>
              <Input
                id="shipping-desc-ka"
                value={
                  typeof form.description === "object"
                    ? form.description?.ka || ""
                    : ""
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: {
                      ...(typeof form.description === "object" ? form.description : {}),
                      ka: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping-price">{t("form.price")}</Label>
              <Input
                id="shipping-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price || ""}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping-free-threshold">{t("form.freeShippingThreshold")}</Label>
              <Input
                id="shipping-free-threshold"
                type="number"
                step="0.01"
                min="0"
                value={form.free_shipping_threshold || ""}
                onChange={(e) =>
                  setForm({ ...form, free_shipping_threshold: e.target.value })
                }
                placeholder={t("form.freeShippingPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping-estimated-days">{t("form.estimatedDays")}</Label>
              <Input
                id="shipping-estimated-days"
                type="number"
                min="0"
                value={form.estimated_days ?? ""}
                onChange={(e) =>
                  setForm({ ...form, estimated_days: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping-position">{t("form.position")}</Label>
              <Input
                id="shipping-position"
                type="number"
                min="0"
                value={form.position ?? ""}
                onChange={(e) =>
                  setForm({ ...form, position: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="shipping-is-active"
                checked={form.is_active ?? true}
                onCheckedChange={(checked) =>
                  setForm({ ...form, is_active: checked })
                }
              />
              <Label htmlFor="shipping-is-active">{t("form.isActive")}</Label>
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
        open={!!deletingMethod}
        onOpenChange={(open) => !open && setDeletingMethod(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", {
                name: deletingMethod ? getName(deletingMethod) : "",
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
